// Dashboard pembeli (/akun): sapaan, ringkasan yang sekaligus filter, situs aktif, daftar pesanan (customer_get_orders)
// dengan aksi per status. Urutan daftar: yang perlu tindakan dulu; pesanan dibatalkan/ditolak dilipat di bawah.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
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
import { REFUNDED_TEXT, STATUS_HINT, asSentence, displayDomain, refundHint } from './components/orderCopy';
import { payOrder, useDocumentTitle } from './components/payment';
import { EmptyState, ErrorState, Skeleton } from './components/States';
import { invoiceStatus, isAwaitingRefund, isPaymentUnderReview, isRefunded } from './components/paymentStatus';
import { StatusPill } from './components/StatusPill';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

type Filter = 'all' | 'unpaid' | 'process' | 'active';

const CLOSED: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['dibatalkan', 'ditolak']);
const isClosed = (order: Order) => CLOSED.has(order.status);

/**
 * Filter = ringkasan di atas daftar. Pembayaran kartu yang sedang ditinjau bank tidak perlu dibayar lagi, jadi masuk
 * "Diproses", bukan "Perlu dibayar" (angka di ringkasan dan isi daftar selalu sama).
 */
const FILTER_TEST: Record<Filter, (order: Order) => boolean> = {
  all: () => true,
  unpaid: (o) => o.status === 'menunggu_pembayaran' && !isPaymentUnderReview(o),
  process: (o) => o.status === 'menunggu_approval' || o.status === 'proses_domain' || isPaymentUnderReview(o),
  active: (o) => o.status === 'aktif',
};

/**
 * Urutan prioritas: perlu dibayar → situs aktif → sedang diproses (termasuk kartu yang ditinjau bank) →
 * dibatalkan/ditolak; di dalam grup terbaru dulu.
 */
const PRIORITY: Record<OrderStatus, number> = {
  menunggu_pembayaran: 0,
  aktif: 1,
  menunggu_approval: 2,
  proses_domain: 2,
  dibatalkan: 3,
  ditolak: 3,
};
const rank = (order: Order) => (isPaymentUnderReview(order) ? PRIORITY.menunggu_approval : PRIORITY[order.status]);

const byPriority = (a: Order, b: Order) =>
  rank(a) - rank(b) || (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : b.id - a.id);

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

  const orders = useMemo(() => (state.status === 'ready' ? [...state.orders].sort(byPriority) : []), [state]);
  const counts = useMemo(
    () => ({
      total: orders.length,
      unpaid: orders.filter(FILTER_TEST.unpaid).length,
      process: orders.filter(FILTER_TEST.process).length,
      active: orders.filter(FILTER_TEST.active).length,
    }),
    [orders],
  );
  const visible = useMemo(() => orders.filter(FILTER_TEST[filter]), [orders, filter]);
  const openOrders = visible.filter((o) => !isClosed(o));
  const closedOrders = visible.filter(isClosed);
  const sites = useMemo(() => orders.filter((o) => o.status === 'aktif' && o.site_id), [orders]);
  const loading = state.status === 'loading';

  const tiles: { key: Filter; label: string; value: number; icon: ReactNode; tone?: 'warning' | 'success' }[] = [
    { key: 'all', label: 'Total pesanan', value: counts.total, icon: <ReceiptText className="h-5 w-5" aria-hidden /> },
    { key: 'unpaid', label: 'Perlu dibayar', value: counts.unpaid, icon: <CreditCard className="h-5 w-5" aria-hidden />, tone: 'warning' },
    { key: 'process', label: 'Diproses', value: counts.process, icon: <Hourglass className="h-5 w-5" aria-hidden /> },
    { key: 'active', label: 'Situs aktif', value: counts.active, icon: <BadgeCheck className="h-5 w-5" aria-hidden />, tone: 'success' },
  ];

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
          Pilih Template
        </Link>
      </header>

      {/* Ringkasan = filter daftar pesanan (tidak ada baris chip terpisah yang mengulang angkanya) */}
      <section
        aria-label="Ringkasan dan filter pesanan"
        className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-4 max-sm:gap-2 sm:mt-8 sm:gap-4 lg:grid-cols-4"
      >
        {tiles.map((tile) => (
          <StatTile
            key={tile.key}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            tone={tile.tone}
            loading={loading}
            pressed={filter === tile.key}
            onClick={() => setFilter(tile.key)}
          />
        ))}
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

      {sites.length > 0 && (
        <section aria-labelledby="sites-title" className="mt-8 sm:mt-10">
          <h2 id="sites-title" className="text-lg font-semibold text-fg sm:text-xl">
            Situs Anda
          </h2>
          <ul className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
            {sites.map((order) => (
              <li key={order.order_number}>
                <SiteCard order={order} />
              </li>
            ))}
          </ul>
        </section>
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

        <div className="mt-4" aria-busy={loading}>
          {loading && (
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
                  Pilih Template
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

          {openOrders.length > 0 && <OrderList orders={openOrders} />}

          {/* Pesanan yang sudah ditutup tidak perlu tindakan: dilipat (terbuka bila hanya itu yang ada) */}
          {closedOrders.length > 0 && (
            <details className={`group ${openOrders.length > 0 ? 'mt-6 sm:mt-8' : ''}`} open={openOrders.length === 0}>
              <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl text-sm font-semibold text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
                Pesanan dibatalkan/ditolak
                <span className="tabular-nums font-medium text-subtle">({closedOrders.length})</span>
                <ChevronDown className="h-4 w-4 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <OrderList orders={closedOrders} className="mt-2" />
            </details>
          )}
        </div>
      </section>
    </div>
  );
}

function OrderList({ orders, className = '' }: { orders: Order[]; className?: string }) {
  return (
    <ul className={`space-y-3 sm:space-y-4 ${className}`}>
      {orders.map((order) => (
        <li key={order.order_number}>
          <OrderCard order={order} />
        </li>
      ))}
    </ul>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone = 'brand',
  loading,
  pressed,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'brand' | 'warning' | 'success';
  loading: boolean;
  pressed: boolean;
  onClick: () => void;
}) {
  const iconTone =
    tone === 'warning' ? 'bg-warning-50 text-warning-700' : tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-primary';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={loading}
      className="card-site flex cursor-pointer flex-col gap-3 p-4 text-left transition-[box-shadow,background-color] duration-200 hover:ring-line-strong active:bg-alt disabled:cursor-default aria-pressed:bg-brand-50 aria-pressed:ring-2 aria-pressed:ring-primary max-sm:min-w-0 max-sm:gap-1 max-sm:p-3 sm:p-5"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl max-sm:hidden sm:h-10 sm:w-10 ${iconTone}`}>{icon}</span>
      <span className="block min-w-0">
        <span className="block text-[13px] leading-tight text-muted max-sm:text-[11px]">{label}</span>
        {loading ? (
          // <span> (bukan Skeleton yang berupa <div>): isi <button> hanya boleh elemen inline
          <span className="mt-1.5 block h-7 w-10 animate-pulse rounded-xl bg-line/70" aria-hidden />
        ) : (
          <span className="block text-[22px] font-semibold leading-tight tabular-nums text-fg sm:text-[30px]">{value}</span>
        )}
      </span>
    </button>
  );
}

/** Kartu situs aktif di atas daftar: jalan pintas ke CMS tanpa perlu mencari pesanannya. */
function SiteCard({ order }: { order: Order }) {
  const { domain } = displayDomain(order);
  return (
    <article className="card-site flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" aria-labelledby={`site-${order.id}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700" aria-hidden>
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id={`site-${order.id}`} className="truncate text-base font-semibold text-fg">
            {domain}
          </h3>
          <p className="truncate text-xs text-subtle">{order.template_name}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link to={`/akun/situs/${order.site_id}`} className="btn btn-primary btn-sm">
          <SquarePen className="h-4 w-4" aria-hidden />
          Kelola Situs
        </Link>
        <a href={`/situs/${order.site_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
          <ExternalLink className="h-4 w-4" aria-hidden />
          Lihat situs
          <span className="sr-only">(tab baru)</span>
        </a>
      </div>
    </article>
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

  const rejectedHint = () => {
    const reason = order.rejected_reason?.trim() ? `Pesanan ditolak: ${asSentence(order.rejected_reason)}` : STATUS_HINT.ditolak;
    if (isAwaitingRefund(order)) return `${reason} ${refundHint(order)}`;
    if (isRefunded(order)) return `${reason} ${REFUNDED_TEXT}`;
    return reason;
  };

  const hint =
    order.status === 'ditolak'
      ? rejectedHint()
      : underReview
        ? 'Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.'
        : STATUS_HINT[order.status];

  return (
    // relative + tautan judul yang direntangkan (after:inset-0): seluruh kartu bisa diketuk ke detail pesanan,
    // tombol aksi tetap di atasnya (relative z-[1])
    <article
      className="card-site relative p-4 transition-shadow duration-200 hover:ring-line-strong sm:p-5"
      aria-labelledby={`order-${order.id}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary sm:flex" aria-hidden>
          <LayoutTemplate className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h3 id={`order-${order.id}`} className="text-base font-semibold leading-snug text-fg sm:text-lg">
                <Link to={detailPath} className="rounded-sm after:absolute after:inset-0 after:rounded-[24px] hover:text-primary">
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
        <Notice tone="danger" className="relative z-[1] mt-4" onClose={() => setPayError(null)}>
          {payError}
        </Notice>
      )}

      <div className="relative z-[1] mt-4 flex flex-wrap gap-2 border-t border-line pt-4 sm:justify-end">
        {unpaid && !underReview && (
          <button type="button" className="btn btn-primary btn-sm" onClick={pay} disabled={paying}>
            {paying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
            {paying ? 'Membuka...' : 'Bayar Sekarang'}
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
              <span className="sr-only">(tab baru)</span>
            </a>
          </>
        )}
        <Link to={detailPath} className="btn btn-outline btn-sm" aria-label={`Detail pesanan ${order.order_number}`}>
          Detail
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
