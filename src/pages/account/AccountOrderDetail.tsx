// Detail pesanan pembeli (/akun/pesanan/:orderNumber): timeline status, tagihan, domain, riwayat, aksi
// (bayar, batalkan, simulasi bayar bila MIDTRANS_SIMULATOR aktif, kelola situs). Setelah kembali dari Midtrans
// (?order_id=…&transaction_status=…) status dimuat ulang tiap 10 detik selama masih menunggu pembayaran.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FlaskConical,
  Globe,
  History,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  SquarePen,
  UserRound,
  X,
} from 'lucide-react';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import {
  ORDER_FLOW,
  formatRupiah,
  formatTanggal,
  type Order,
  type OrderLog,
  type OrderStatus,
  type PaymentConfig,
  type Site,
} from '../../types/platform';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Notice, type NoticeTone } from './components/Notice';
import { STEP_TEXT, STEP_TITLE, stepTime } from './components/orderCopy';
import { payOrder, useDocumentTitle, type OrderCreatedState } from './components/payment';
import { EmptyState, ErrorState, Skeleton } from './components/States';
import {
  PAYMENT_TONE_CLASS,
  invoiceStatus,
  isPaymentUnderReview,
  paymentStatusLabel,
  paymentTypeLabel,
} from './components/paymentStatus';
import { StatusPill } from './components/StatusPill';

interface OrderDetail {
  order: Order;
  logs: OrderLog[];
  site: Site | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: OrderDetail };

interface Flash {
  tone: NoticeTone;
  title?: string;
  text: string;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 30; // 5 menit

const FAILED_TX = new Set(['deny', 'cancel', 'expire', 'failure']);
// Midtrans sudah menerima pembayaran di halamannya; lunas atau tidaknya tetap ditentukan status pesanan dari server
// ('capture' bisa ditahan untuk tinjauan fraud).
const SUBMITTED_TX = new Set(['settlement', 'capture', 'simulated']);

const LOG_EVENT_LABEL: Record<string, string> = {
  created: 'Pesanan dibuat',
  payment_created: 'Link pembayaran dibuat',
  payment_update: 'Pembaruan pembayaran',
  approved: 'Pesanan disetujui',
  rejected: 'Pesanan ditolak',
  domain_set: 'Domain ditetapkan',
  activated: 'Situs diaktifkan',
  cancelled: 'Pesanan dibatalkan',
  note: 'Catatan',
};

export default function AccountOrderDetail() {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(() => {
    const created = location.state as OrderCreatedState | null;
    if (!created?.justCreated) return null;
    return created.paymentError
      ? {
          tone: 'warning',
          title: 'Pesanan berhasil dibuat',
          text: `Halaman pembayaran belum bisa dibuka: ${created.paymentError} Anda bisa mencoba lagi lewat tombol "Bayar sekarang".`,
        }
      : { tone: 'success', title: 'Pesanan berhasil dibuat', text: 'Kami akan memproses pesanan Anda.' };
  });

  // Kembali dari halaman Midtrans (callback finish menambahkan order_id & transaction_status)
  const returnTx = params.get('transaction_status');
  const returnedFromPayment = Boolean(returnTx || params.get('order_id'));
  const [polls, setPolls] = useState(0);
  const statusRef = useRef<OrderStatus | null>(null);

  useDocumentTitle(`Pesanan ${orderNumber}`);

  // State "baru dibuat" cukup dipakai sekali (tidak muncul lagi saat halaman dimuat ulang)
  useEffect(() => {
    if ((location.state as OrderCreatedState | null)?.justCreated) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const apply = useCallback((data: OrderDetail) => {
    const previous = statusRef.current;
    statusRef.current = data.order.status;
    setState({ status: 'ready', data });
    if (previous === 'menunggu_pembayaran' && data.order.status === 'menunggu_approval') {
      setFlash({
        tone: 'success',
        title: 'Pembayaran diterima',
        text: 'Terima kasih! Pesanan Anda sekarang menunggu persetujuan tim kami.',
      });
    } else if (previous === 'menunggu_pembayaran' && data.order.status === 'dibatalkan') {
      // Dibatalkan sistem/Midtrans (kedaluwarsa, gagal), bukan oleh pembeli sendiri
      const cancelLog = [...data.logs].reverse().find((log) => log.to_status === 'dibatalkan');
      if (cancelLog?.actor_type !== 'customer') {
        setFlash({ tone: 'warning', title: 'Pesanan dibatalkan', text: 'Pembayaran tidak diselesaikan sehingga pesanan dibatalkan.' });
      }
    }
  }, []);

  const fetchDetail = useCallback(
    () => apiPost<OrderDetail>('customer_get_order', { order_number: orderNumber }),
    [orderNumber],
  );

  // Muat pertama
  useEffect(() => {
    let alive = true;
    statusRef.current = null;
    fetchDetail()
      .then((data) => alive && apply(data))
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: 'not_found' });
        else setState({ status: 'error', message: errorMessage(err, 'Detail pesanan belum bisa dimuat.') });
      });
    return () => {
      alive = false;
    };
  }, [fetchDetail, apply]);

  // Konfigurasi pembayaran (tombol simulasi hanya bila simulator aktif)
  useEffect(() => {
    let alive = true;
    apiGet<PaymentConfig>('get_payment_config')
      .then((cfg) => alive && setConfig(cfg))
      .catch(() => alive && setConfig(null));
    return () => {
      alive = false;
    };
  }, []);

  /** Muat ulang (tombol, setelah aksi, atau polling). Gagal saat data sudah tampil → pemberitahuan saja. */
  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        apply(await fetchDetail());
      } catch (err) {
        if (!silent) setFlash({ tone: 'danger', text: errorMessage(err, 'Gagal memuat ulang pesanan.') });
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [apply, fetchDetail],
  );

  const order = state.status === 'ready' ? state.data.order : null;
  const polling = returnedFromPayment && order?.status === 'menunggu_pembayaran' && polls < MAX_POLLS;

  useEffect(() => {
    if (!polling) return;
    const id = window.setTimeout(async () => {
      if (document.visibilityState === 'visible') await reload(true);
      setPolls((n) => n + 1);
    }, POLL_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [polling, polls, reload]);

  const retryLoad = () => {
    setState({ status: 'loading' });
    fetchDetail()
      .then(apply)
      .catch((err: unknown) =>
        setState(
          err instanceof ApiError && err.status === 404
            ? { status: 'not_found' }
            : { status: 'error', message: errorMessage(err, 'Detail pesanan belum bisa dimuat.') },
        ),
      );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-4 sm:px-8 sm:pb-20 sm:pt-8">
      <Link to="/akun" className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Pesanan saya
      </Link>

      <div className="mt-3" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <DetailSkeleton />}

        {state.status === 'error' && <ErrorState title="Pesanan belum bisa dimuat" message={state.message} onRetry={retryLoad} />}

        {state.status === 'not_found' && (
          <EmptyState
            icon={<ReceiptText className="h-7 w-7" aria-hidden />}
            title="Pesanan tidak ditemukan"
            description={`Pesanan ${orderNumber} tidak ada di akun Anda. Periksa kembali nomor pesanannya.`}
            action={
              <Link to="/akun" className="btn btn-primary">
                Kembali ke pesanan saya
              </Link>
            }
          />
        )}

        {state.status === 'ready' && (
          <OrderView
            data={state.data}
            simulator={Boolean(config?.simulator)}
            flash={flash}
            onFlash={setFlash}
            returnTx={returnTx}
            polling={polling}
            pollsExhausted={returnedFromPayment && order?.status === 'menunggu_pembayaran' && polls >= MAX_POLLS}
            refreshing={refreshing}
            onReload={() => reload()}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Tampilan pesanan ─────────────────────────── */

interface OrderViewProps {
  data: OrderDetail;
  simulator: boolean;
  flash: Flash | null;
  onFlash: (flash: Flash | null) => void;
  returnTx: string | null;
  polling: boolean;
  pollsExhausted: boolean;
  refreshing: boolean;
  onReload: () => Promise<void> | void;
}

function OrderView({ data, simulator, flash, onFlash, returnTx, polling, pollsExhausted, refreshing, onReload }: OrderViewProps) {
  const { order, logs, site } = data;
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia (mis. http biasa): abaikan
    }
  };

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <span>No. pesanan</span>
            <span className="font-medium tabular-nums text-fg">{order.order_number}</span>
            <button
              type="button"
              onClick={copyNumber}
              aria-label={copied ? 'Nomor pesanan tersalin' : 'Salin nomor pesanan'}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-subtle transition-colors after:absolute after:-inset-2 hover:bg-alt hover:text-fg"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{order.template_name}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusPill status={order.status} />
            <span className="text-xs text-subtle">Dibuat {formatTanggal(order.created_at, true)}</span>
          </div>
        </div>
        <button type="button" onClick={() => onReload()} disabled={refreshing} className="btn btn-outline btn-sm self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Muat ulang
        </button>
      </header>

      <div className="mt-5 space-y-3 empty:hidden">
        {flash && (
          <Notice tone={flash.tone} title={flash.title} onClose={() => onFlash(null)}>
            {flash.text}
          </Notice>
        )}
        <PaymentReturnNotice order={order} returnTx={returnTx} polling={polling} pollsExhausted={pollsExhausted} onReload={onReload} refreshing={refreshing} />
        {site?.status === 'suspended' && (
          <Notice tone="warning" title="Situs sedang dinonaktifkan">
            Situs Anda untuk sementara tidak tampil dan kontennya tidak bisa diubah.{' '}
            <Link to="/#kontak" className="font-semibold underline underline-offset-2">
              Hubungi kami
            </Link>{' '}
            untuk informasi lebih lanjut.
          </Notice>
        )}
        {order.status === 'ditolak' && (
          <Notice tone="danger" title="Pesanan ditolak">
            {order.rejected_reason ? `Alasan: ${order.rejected_reason}` : 'Tim kami menolak pesanan ini.'} Ada pertanyaan?{' '}
            <Link to="/#kontak" className="font-semibold underline underline-offset-2">
              Hubungi kami
            </Link>
            .
          </Notice>
        )}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0 space-y-5">
          <TimelineCard order={order} logs={logs} />
          <DomainCard order={order} site={site} />
          <CustomerCard order={order} />
          <HistoryCard logs={logs} />
        </div>
        <div className="order-first space-y-5 lg:order-none lg:sticky lg:top-24">
          <InvoiceCard order={order} site={site} simulator={simulator} onFlash={onFlash} onReload={onReload} />
        </div>
      </div>
    </>
  );
}

function PaymentReturnNotice({
  order,
  returnTx,
  polling,
  pollsExhausted,
  onReload,
  refreshing,
}: {
  order: Order;
  returnTx: string | null;
  polling: boolean;
  pollsExhausted: boolean;
  onReload: () => Promise<void> | void;
  refreshing: boolean;
}) {
  if (order.status !== 'menunggu_pembayaran') return null;
  const tx = returnTx?.toLowerCase() ?? null;

  if (tx && FAILED_TX.has(tx)) {
    return (
      <Notice tone="warning" title="Pembayaran belum berhasil">
        Status dari Midtrans: {paymentStatusLabel(tx)}. Anda bisa mencoba membayar lagi lewat tombol "Bayar sekarang".
      </Notice>
    );
  }
  if (isPaymentUnderReview(order)) {
    return (
      <Notice
        tone="info"
        title="Pembayaran sedang ditinjau bank"
        action={
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onReload()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Periksa lagi
          </button>
        }
      >
        Pembayaran kartu Anda sedang diperiksa oleh bank/Midtrans, jadi tidak perlu membayar ulang. Pesanan diproses
        otomatis setelah pemeriksaan selesai; bila ditolak bank, pesanan dibatalkan.
      </Notice>
    );
  }
  if (polling) {
    return (
      <Notice
        tone="info"
        title={tx && SUBMITTED_TX.has(tx) ? 'Pembayaran sedang dikonfirmasi' : 'Menunggu konfirmasi pembayaran'}
        action={
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onReload()} disabled={refreshing}>
            {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Periksa sekarang
          </button>
        }
      >
        {tx === 'pending'
          ? 'Selesaikan pembayaran sesuai instruksi di halaman Midtrans (mis. transfer ke nomor virtual account). '
          : ''}
        Status pesanan diperbarui otomatis setiap 10 detik.
      </Notice>
    );
  }
  if (pollsExhausted) {
    return (
      <Notice
        tone="info"
        title="Konfirmasi pembayaran belum kami terima"
        action={
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onReload()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Periksa lagi
          </button>
        }
      >
        Bila Anda sudah membayar, konfirmasi biasanya masuk dalam beberapa menit. Muat ulang halaman ini nanti.
      </Notice>
    );
  }
  return null;
}

/* ─────────────────────────── Kartu ─────────────────────────── */

function Card({ title, icon, children, aside }: { title: string; icon: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card-site p-5 sm:p-6" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

interface Step {
  key: string;
  title: string;
  text: string;
  time: string | null;
  state: StepState;
  terminal?: OrderStatus;
}

/** Langkah timeline dari status pesanan (alur normal + langkah akhir bila ditolak/dibatalkan). */
function buildSteps(order: Order, logs: OrderLog[]): Step[] {
  const flowIndex = ORDER_FLOW.indexOf(order.status);
  const terminated = flowIndex < 0;
  // Ditolak setelah dibayar berhenti di langkah 2, selain itu di langkah 1
  const reached = terminated ? (order.status === 'ditolak' && order.paid_at ? 1 : 0) : flowIndex;

  const steps: Step[] = [];
  ORDER_FLOW.forEach((status, i) => {
    if (terminated && i > reached) return;
    const state: StepState =
      i < reached || terminated || (status === 'aktif' && order.status === 'aktif') ? 'done' : i === reached ? 'current' : 'upcoming';
    const copy = STEP_TEXT[status];
    const current = status === 'menunggu_pembayaran' && isPaymentUnderReview(order) ? 'Pembayaran kartu Anda sedang ditinjau bank.' : copy.current;
    steps.push({
      key: status,
      title: STEP_TITLE[status],
      text: state === 'done' ? copy.done : state === 'current' ? current : copy.waiting,
      time: state === 'upcoming' ? null : stepTime(order, status),
      state,
    });
  });

  if (terminated) {
    const log = [...logs].reverse().find((l) => l.to_status === order.status);
    const reason =
      order.status === 'ditolak'
        ? order.rejected_reason
          ? `Alasan: ${order.rejected_reason}`
          : STEP_TEXT.ditolak.current
        : log?.note || STEP_TEXT.dibatalkan.current;
    steps.push({
      key: order.status,
      title: STEP_TITLE[order.status],
      text: reason,
      time: order.status === 'dibatalkan' ? order.cancelled_at || log?.created_at || null : log?.created_at || order.updated_at,
      state: 'stopped',
      terminal: order.status,
    });
  }
  return steps;
}

function TimelineCard({ order, logs }: { order: Order; logs: OrderLog[] }) {
  const steps = buildSteps(order, logs);
  return (
    <Card title="Status pesanan" icon={<History className="h-[18px] w-[18px]" aria-hidden />}>
      <ol className="relative">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
              {!last && (
                <span
                  className={`absolute left-[13px] top-8 bottom-1 w-0.5 rounded-full ${step.state === 'done' ? 'bg-primary' : 'bg-line'}`}
                  aria-hidden
                />
              )}
              <StepDot step={step} index={i} />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      step.state === 'upcoming' ? 'text-subtle' : step.state === 'stopped' && step.terminal === 'ditolak' ? 'text-danger-700' : 'text-fg'
                    }`}
                  >
                    {step.title}
                    {step.state === 'current' && <span className="sr-only"> (tahap saat ini)</span>}
                  </p>
                  {step.time && <time className="text-xs tabular-nums text-subtle">{formatTanggal(step.time, true)}</time>}
                </div>
                <p className={`mt-0.5 text-[13px] leading-relaxed ${step.state === 'upcoming' ? 'text-subtle' : 'text-muted'}`}>{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function StepDot({ step, index }: { step: Step; index: number }) {
  const base = 'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full';
  if (step.state === 'stopped') {
    return step.terminal === 'ditolak' ? (
      <span className={`${base} bg-danger-50 text-danger ring-1 ring-inset ring-danger/30`}>
        <X className="h-4 w-4" aria-hidden />
      </span>
    ) : (
      <span className={`${base} bg-alt text-subtle ring-1 ring-inset ring-line-strong`}>
        <Ban className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  if (step.state === 'done') {
    return (
      <span className={`${base} bg-primary text-white`}>
        <Check className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (step.state === 'current') {
    return (
      <span className={`${base} bg-surface ring-2 ring-primary`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-60 motion-reduce:hidden" aria-hidden />
        <span className="relative h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
      </span>
    );
  }
  return (
    <span className={`${base} bg-surface text-xs font-semibold tabular-nums text-subtle ring-1 ring-inset ring-line-strong`}>
      {index + 1}
    </span>
  );
}

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-sm ${strong ? 'font-semibold text-fg' : 'font-medium text-fg'}`}>{children}</dd>
    </div>
  );
}

function InvoiceCard({
  order,
  site,
  simulator,
  onFlash,
  onReload,
}: {
  order: Order;
  site: Site | null;
  simulator: boolean;
  onFlash: (flash: Flash | null) => void;
  onReload: () => Promise<void> | void;
}) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const unpaid = order.status === 'menunggu_pembayaran';
  // Membayar ulang selama tinjauan membuat transaksi baru (risiko tagihan ganda), jadi tombol bayar disembunyikan
  const underReview = isPaymentUnderReview(order);
  const siteId = site?.id ?? order.site_id;
  const payment = invoiceStatus(order);

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await payOrder(order.order_number);
    } catch (err) {
      const notConfigured = err instanceof ApiError && err.code === 'PAYMENT_NOT_CONFIGURED';
      setPayError(
        notConfigured && simulator
          ? `${err.message} Untuk pengujian, gunakan tombol "Simulasikan pembayaran".`
          : errorMessage(err, 'Gagal membuka halaman pembayaran. Silakan coba lagi.'),
      );
      setPaying(false);
    }
  };

  const simulate = async () => {
    setSimulating(true);
    setPayError(null);
    try {
      await apiPost('dev_simulate_payment', { order_number: order.order_number });
      onFlash({ tone: 'success', title: 'Pembayaran simulasi berhasil', text: 'Pesanan sekarang menunggu persetujuan tim kami.' });
      await onReload();
    } catch (err) {
      setPayError(errorMessage(err, 'Simulasi pembayaran gagal.'));
    } finally {
      setSimulating(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await apiPost('customer_cancel_order', { order_number: order.order_number });
      setConfirmOpen(false);
      onFlash({ tone: 'success', text: 'Pesanan berhasil dibatalkan.' });
      await onReload();
    } catch (err) {
      setCancelError(errorMessage(err, 'Gagal membatalkan pesanan.'));
    } finally {
      setCancelling(false);
    }
  };

  const busy = paying || simulating || cancelling;

  return (
    <section className="card-site overflow-hidden" aria-labelledby="invoice-title">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="invoice-title" className="flex items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
          <ReceiptText className="h-[18px] w-[18px] text-primary" aria-hidden />
          Tagihan
        </h2>
        <span
          className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_TONE_CLASS[payment.tone]}`}
        >
          {payment.label}
        </span>
      </div>

      <dl className="divide-y divide-line px-5 pt-2 sm:px-6">
        <Row label="No. pesanan">
          <span className="tabular-nums">{order.order_number}</span>
        </Row>
        <Row label="Template">{order.template_name}</Row>
        <Row label="Harga template">
          <span className="tabular-nums">{formatRupiah(order.price)}</span>
        </Row>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-sm font-semibold text-fg">Total</dt>
          <dd className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">{formatRupiah(order.price)}</dd>
        </div>
        {order.payment_type && <Row label="Metode">{paymentTypeLabel(order.payment_type)}</Row>}
        {order.paid_at && <Row label="Dibayar pada">{formatTanggal(order.paid_at, true)}</Row>}
      </dl>

      <div className="space-y-2.5 border-t border-line bg-alt/60 px-5 py-5 sm:px-6">
        {payError && (
          <Notice tone="danger" onClose={() => setPayError(null)}>
            {payError}
          </Notice>
        )}

        {unpaid && (
          <>
            {!underReview && (
              <button type="button" className="btn btn-primary btn-lg w-full" onClick={pay} disabled={busy}>
                {paying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
                {paying ? 'Membuka pembayaran...' : 'Bayar sekarang'}
              </button>
            )}
            {simulator && (
              <button type="button" className="btn btn-secondary w-full" onClick={simulate} disabled={busy}>
                {simulating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
                Simulasikan pembayaran (mode uji)
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost w-full text-danger-700 hover:bg-danger-50 hover:text-danger-700"
              onClick={() => {
                setCancelError(null);
                setConfirmOpen(true);
              }}
              disabled={busy}
            >
              Batalkan pesanan
            </button>
            <p className="pt-1 text-center text-xs text-subtle">
              {underReview
                ? 'Pembayaran kartu sedang ditinjau bank. Status diperbarui otomatis setelah peninjauan selesai.'
                : 'Pembayaran diproses oleh Midtrans. Status diperbarui otomatis setelah pembayaran berhasil.'}
            </p>
          </>
        )}

        {order.status === 'aktif' && siteId && (
          <>
            <Link to={`/akun/situs/${siteId}`} className="btn btn-primary btn-lg w-full">
              <SquarePen className="h-4 w-4" aria-hidden />
              Kelola konten situs
            </Link>
            <a href={`/situs/${siteId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Lihat situs
            </a>
          </>
        )}

        {(order.status === 'menunggu_approval' || order.status === 'proses_domain') && (
          <p className="text-[13px] text-muted">
            Tidak ada yang perlu Anda lakukan saat ini. Kami kabari lewat email atau WhatsApp bila ada perkembangan.
          </p>
        )}

        {order.status === 'dibatalkan' &&
          (order.template_slug ? (
            <Link to={`/pesan/${encodeURIComponent(order.template_slug)}`} className="btn btn-primary w-full">
              Pesan lagi
            </Link>
          ) : (
            <Link to="/#templates" className="btn btn-primary w-full">
              Lihat Template
            </Link>
          ))}

        {order.status === 'ditolak' && (
          <Link to="/#kontak" className="btn btn-outline w-full">
            Hubungi kami
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Batalkan pesanan?"
        description={
          <>
            Pesanan <span className="font-semibold tabular-nums text-fg">{order.order_number}</span> akan dibatalkan dan link
            pembayarannya tidak bisa dipakai lagi. Tindakan ini tidak bisa diurungkan.
          </>
        }
        confirmLabel="Ya, batalkan"
        cancelLabel="Kembali"
        tone="danger"
        loading={cancelling}
        error={cancelError}
        onConfirm={cancel}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}

function DomainCard({ order, site }: { order: Order; site: Site | null }) {
  const finalDomain = order.domain || site?.domain || null;
  return (
    <Card title="Domain" icon={<Globe className="h-[18px] w-[18px]" aria-hidden />}>
      <dl className="divide-y divide-line">
        <Row label="Domain diminta">{order.domain_primary}</Row>
        <Row label="Domain alternatif">{order.domain_alternative || <span className="text-subtle">-</span>}</Row>
        <Row label="Domain final" strong>
          {finalDomain ? (
            order.status === 'aktif' ? (
              <a href={`https://${finalDomain}`} target="_blank" rel="noopener noreferrer" className="link-site inline-flex items-center gap-1">
                {finalDomain}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              finalDomain
            )
          ) : (
            <span className="font-normal text-subtle">Belum ditetapkan</span>
          )}
        </Row>
      </dl>
      {!finalDomain && order.status !== 'ditolak' && order.status !== 'dibatalkan' && (
        <p className="mt-3 text-xs text-subtle">
          Domain final ditetapkan tim kami setelah pesanan disetujui. Bila domain utama tidak tersedia, kami memakai domain
          alternatif atau menghubungi Anda.
        </p>
      )}
    </Card>
  );
}

function CustomerCard({ order }: { order: Order }) {
  return (
    <Card title="Data pemesan" icon={<UserRound className="h-[18px] w-[18px]" aria-hidden />}>
      <dl className="divide-y divide-line">
        <Row label="Nama">{order.customer_name}</Row>
        <Row label="Email">{order.customer_email}</Row>
        <Row label="Nomor HP">
          <span className="tabular-nums">{order.customer_phone}</span>
        </Row>
        <Row label="Perusahaan">{order.company_name || <span className="text-subtle">-</span>}</Row>
      </dl>
      {order.notes && (
        <div className="mt-3 rounded-xl bg-alt px-4 py-3">
          <p className="text-xs font-medium text-subtle">Catatan</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-fg">{order.notes}</p>
        </div>
      )}
    </Card>
  );
}

function HistoryCard({ logs }: { logs: OrderLog[] }) {
  if (logs.length === 0) return null;
  const ordered = [...logs].reverse();
  return (
    <Card title="Riwayat" icon={<History className="h-[18px] w-[18px]" aria-hidden />}>
      <ul className="divide-y divide-line">
        {ordered.map((log) => (
          <li key={log.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{LOG_EVENT_LABEL[log.event] ?? log.event}</p>
              {log.note && <p className="mt-0.5 break-words text-[13px] text-muted">{log.note}</p>}
              {log.actor_name && <p className="mt-0.5 text-xs text-subtle">oleh {log.actor_name}</p>}
            </div>
            <time className="shrink-0 text-xs tabular-nums text-subtle">{formatTanggal(log.created_at, true)}</time>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-2/3 sm:h-10" />
      <Skeleton className="mt-3 h-6 w-48" />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="card-site space-y-5 p-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="card-site order-first space-y-3 p-6 lg:order-none">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
