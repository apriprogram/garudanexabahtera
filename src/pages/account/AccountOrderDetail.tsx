// Detail pesanan pembeli (/akun/pesanan/:orderNumber): masa aktif + hitung mundur dan perpanjangan (pesanan aktif),
// timeline status (+ riwayat lengkap yang bisa dibuka), tagihan (+ nota), domain, aksi (bayar, batalkan, simulasi bayar
// bila MIDTRANS_SIMULATOR aktif, kelola situs, pesan lagi, tanya via WhatsApp). Setelah kembali dari Midtrans
// (?order_id=…&transaction_status=…) status dimuat ulang tiap 10 detik selama pesanan, atau tagihan perpanjangan bila
// order_id = GNR-…, masih menunggu pembayaran. Aturan masa aktif: docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §5.
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  History,
  LoaderCircle,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  ScrollText,
  SquarePen,
  UserRound,
  X,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import { rupiahCompact } from '../../lib/domainPricing';
import { LEGAL_LABELS, LEGAL_PATHS } from '../../lib/legal';
import {
  ORDER_FLOW,
  RENEWAL_STATUS_LABEL,
  formatRupiah,
  formatTanggal,
  type Order,
  type OrderLog,
  type OrderStatus,
  type PaymentConfig,
  type Renewal,
  type RenewalOffer,
  type RenewalStatus,
  type Site,
} from '../../types/platform';
import {
  clockText,
  countdownLabel,
  periodTone,
  periodWarning,
  progress,
  remaining,
  shortDate,
  type PeriodTone,
} from './components/activePeriod';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Notice, type NoticeTone } from './components/Notice';
import {
  REFUNDED_TEXT,
  STEP_TEXT,
  STEP_TITLE,
  asSentence,
  cancelledText,
  customerHistoryEntry,
  helpWhatsappUrl,
  orderHelpMessage,
  refundText,
  stepTime,
  type HistoryEntry,
} from './components/orderCopy';
import { goToPayment, isPaymentUrl, payOrder, useDocumentTitle, type OrderCreatedState } from './components/payment';
import {
  ACTIVE_PERIOD_ANCHOR,
  cancelRenewal,
  createRenewal,
  hasOrderInvoice,
  orderInvoicePath,
  payRenewal,
  pendingRenewal,
  renewalBreakdown,
  renewalDomain,
  renewalInvoicePath,
  renewalNumberFromReturn,
  simulateRenewalPayment,
  type CreateRenewalResult,
} from './components/renewal';
import { EmptyState, ErrorState, Skeleton } from './components/States';
import {
  PAYMENT_TONE_CLASS,
  invoiceStatus,
  isAwaitingRefund,
  isNeverCharged,
  isPaymentUnderReview,
  isRefunded,
  paymentStatusLabel,
  paymentTypeLabel,
} from './components/paymentStatus';
import { StatusPill } from './components/StatusPill';

interface OrderDetail {
  order: Order;
  logs: OrderLog[];
  site: Site | null;
  /** Tagihan perpanjangan pesanan ini, terbaru dulu (tidak ada di respons lama = kosong) */
  renewals?: Renewal[];
  /** Penawaran perpanjangan (harga per tahun, pilihan 1–3 tahun) */
  renewal?: RenewalOffer | null;
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
/** Status yang masih bisa berubah dari sisi kami/Midtrans; hanya di sini tombol "Muat ulang" berguna. */
const RELOADABLE: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['menunggu_pembayaran', 'menunggu_approval', 'proses_domain']);

/** Pemberitahuan setelah perpanjangan lunas; `expires` = tanggal berakhir hosting & jasa yang baru. */
const renewalPaidFlash = (expires: string | null | undefined): Flash => ({
  tone: 'success',
  title: 'Perpanjangan berhasil',
  text: expires ? `Masa aktif sekarang sampai ${formatTanggal(expires)}.` : 'Masa aktif Anda sudah diperpanjang.',
});

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
          text: `Halaman pembayaran belum bisa dibuka: ${created.paymentError} Anda bisa mencoba lagi lewat tombol "Bayar Sekarang".`,
        }
      : { tone: 'success', title: 'Pesanan berhasil dibuat', text: 'Kami akan memproses pesanan Anda.' };
  });

  // Kembali dari halaman Midtrans (callback finish menambahkan order_id & transaction_status). order_id GNR-… = tagihan
  // perpanjangan pesanan ini, selain itu pembayaran pesanan.
  const returnTx = params.get('transaction_status');
  const returnedFromPayment = Boolean(returnTx || params.get('order_id'));
  const returnRenewalNumber = renewalNumberFromReturn(params.get('order_id'));
  const [polls, setPolls] = useState(0);
  const statusRef = useRef<OrderStatus | null>(null);
  const renewalFlashedRef = useRef(false);

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
    // Kembali dari pembayaran perpanjangan: sekali saja, baik sudah lunas saat dimuat maupun setelah polling
    if (returnRenewalNumber && !renewalFlashedRef.current) {
      const returned = data.renewals?.find((r) => r.renewal_number === returnRenewalNumber);
      if (returned?.status === 'lunas') {
        renewalFlashedRef.current = true;
        setFlash(renewalPaidFlash(data.order.service_expires_at ?? returned.service_expires_after));
      }
    }
  }, [returnRenewalNumber]);

  const fetchDetail = useCallback(
    () => apiPost<OrderDetail>('customer_get_order', { order_number: orderNumber }),
    [orderNumber],
  );

  // Muat pertama
  useEffect(() => {
    let alive = true;
    statusRef.current = null;
    renewalFlashedRef.current = false;
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
  const returnRenewal =
    state.status === 'ready' && returnRenewalNumber
      ? (state.data.renewals?.find((r) => r.renewal_number === returnRenewalNumber) ?? null)
      : null;
  // Yang ditunggu konfirmasinya: tagihan perpanjangan (order_id GNR-…) atau pesanan itu sendiri
  const awaitingPayment = returnRenewalNumber
    ? returnRenewal?.status === 'menunggu_pembayaran'
    : order?.status === 'menunggu_pembayaran';
  const polling = returnedFromPayment && awaitingPayment && polls < MAX_POLLS;
  const pollsExhausted = returnedFromPayment && awaitingPayment && polls >= MAX_POLLS;

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
            returnRenewal={returnRenewal}
            polling={polling}
            pollsExhausted={pollsExhausted}
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
  /** Tagihan perpanjangan yang baru dibayar di Midtrans (order_id GNR-…), null bila kembali dari pembayaran pesanan */
  returnRenewal: Renewal | null;
  polling: boolean;
  pollsExhausted: boolean;
  refreshing: boolean;
  onReload: () => Promise<void> | void;
}

function OrderView({
  data,
  simulator,
  flash,
  onFlash,
  returnTx,
  returnRenewal,
  polling,
  pollsExhausted,
  refreshing,
  onReload,
}: OrderViewProps) {
  const { order, logs, site } = data;
  const renewals = data.renewals ?? [];
  const [copied, setCopied] = useState(false);
  const { settings } = useSiteSettings();
  const helpHref = helpWhatsappUrl(settings, orderHelpMessage(order.order_number));
  const awaitingRefund = isAwaitingRefund(order);
  const { hash } = useLocation();

  // Tautan "Perpanjang" dari dashboard (#masa-aktif): gulir ke kartu masa aktif setelah data tampil, fokus ikut pindah
  useEffect(() => {
    if (hash !== `#${ACTIVE_PERIOD_ANCHOR}`) return;
    const card = document.getElementById(ACTIVE_PERIOD_ANCHOR);
    if (!card) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    card.focus({ preventScroll: true });
  }, [hash]);

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
      {/* relative: di HP tombol Muat ulang (ikon) diletakkan sebaris dengan No. pesanan */}
      <header className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 text-[13px] text-muted ${RELOADABLE.has(order.status) ? 'max-sm:pr-10' : ''}`}>
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
        {/* HP: tombol ikon tanpa garis di kanan baris No. pesanan. ≥ 640px: tombol bergaris (btn-outline) di kanan judul. */}
        {RELOADABLE.has(order.status) && (
          <button
            type="button"
            onClick={() => onReload()}
            disabled={refreshing}
            className="btn btn-ghost btn-sm max-sm:absolute max-sm:-top-0.5 max-sm:right-0 max-sm:w-8 max-sm:px-0 max-sm:after:-inset-x-1.5 sm:bg-surface sm:text-fg sm:ring-1 sm:ring-inset sm:ring-line sm:hover:bg-alt sm:hover:ring-line-strong sm:active:bg-line"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            <span className="max-sm:sr-only">Muat ulang</span>
          </button>
        )}
      </header>

      <div className="mt-5 space-y-3 empty:hidden">
        {flash && (
          <Notice tone={flash.tone} title={flash.title} onClose={() => onFlash(null)}>
            {flash.text}
          </Notice>
        )}
        {returnRenewal ? (
          <RenewalReturnNotice
            renewal={returnRenewal}
            returnTx={returnTx}
            polling={polling}
            pollsExhausted={pollsExhausted}
            onReload={onReload}
            refreshing={refreshing}
          />
        ) : (
          <PaymentReturnNotice order={order} returnTx={returnTx} polling={polling} pollsExhausted={pollsExhausted} onReload={onReload} refreshing={refreshing} />
        )}
        {site?.status === 'suspended' && (
          <Notice tone="warning" title="Situs sedang dinonaktifkan">
            Situs Anda untuk sementara tidak tampil dan kontennya tidak bisa diubah.{' '}
            <a href={helpHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
              Tanya via WhatsApp
            </a>{' '}
            untuk informasi lebih lanjut.
          </Notice>
        )}
        {order.status === 'ditolak' && (
          <Notice tone="danger" title="Pesanan ditolak">
            <p>{order.rejected_reason?.trim() ? `Alasan: ${asSentence(order.rejected_reason)}` : 'Tim kami menolak pesanan ini.'}</p>
            {awaitingRefund && (
              <p className="mt-1.5">
                {refundText(order)}{' '}
                <Link to={LEGAL_PATHS.refund} className="font-semibold underline underline-offset-2">
                  {LEGAL_LABELS.refund}
                </Link>
              </p>
            )}
            {isRefunded(order) && <p className="mt-1.5">{REFUNDED_TEXT}</p>}
          </Notice>
        )}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0 space-y-5">
          {order.status === 'aktif' && (
            <ActivePeriodCard
              order={order}
              renewals={renewals}
              offer={data.renewal ?? null}
              simulator={simulator}
              helpHref={helpHref}
              onFlash={onFlash}
              onReload={onReload}
            />
          )}
          <TimelineCard order={order} logs={logs} />
          <DomainCard order={order} site={site} />
          <CustomerCard order={order} />
        </div>
        <div className="order-first space-y-5 lg:order-none lg:sticky lg:top-24">
          <InvoiceCard order={order} site={site} simulator={simulator} helpHref={helpHref} onFlash={onFlash} onReload={onReload} />
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
        Status dari Midtrans: {paymentStatusLabel(tx)}. Anda bisa mencoba membayar lagi lewat tombol "Bayar Sekarang".
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

/**
 * Kembali dari pembayaran perpanjangan (order_id GNR-…): pola yang sama dengan PaymentReturnNotice selama tagihan masih
 * menunggu pembayaran. Lunas → pemberitahuan sukses (flash); dibatalkan → terlihat di riwayat perpanjangan.
 */
function RenewalReturnNotice({
  renewal,
  returnTx,
  polling,
  pollsExhausted,
  onReload,
  refreshing,
}: {
  renewal: Renewal;
  returnTx: string | null;
  polling: boolean;
  pollsExhausted: boolean;
  onReload: () => Promise<void> | void;
  refreshing: boolean;
}) {
  if (renewal.status !== 'menunggu_pembayaran') return null;
  const tx = returnTx?.toLowerCase() ?? null;

  if (tx && FAILED_TX.has(tx)) {
    return (
      <Notice tone="warning" title="Pembayaran perpanjangan belum berhasil">
        Status dari Midtrans: {paymentStatusLabel(tx)}. Anda bisa mencoba membayar lagi lewat tombol "Bayar Sekarang" di
        bagian Masa aktif.
      </Notice>
    );
  }
  if (polling) {
    return (
      <Notice
        tone="info"
        title={tx && SUBMITTED_TX.has(tx) ? 'Pembayaran perpanjangan sedang dikonfirmasi' : 'Menunggu konfirmasi pembayaran perpanjangan'}
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
        Masa aktif bertambah otomatis setelah pembayaran dikonfirmasi; status diperbarui setiap 10 detik.
      </Notice>
    );
  }
  if (pollsExhausted) {
    return (
      <Notice
        tone="info"
        title="Konfirmasi pembayaran perpanjangan belum kami terima"
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

/** Keterangan langkah yang sudah dilalui; langkah pembayaran menyebut metode yang dipakai bila diketahui. */
function doneText(order: Order, status: OrderStatus): string {
  if (status === 'menunggu_approval' && order.payment_type) {
    return order.payment_type === 'gratis' ? 'Template gratis, tanpa pembayaran.' : `Lunas lewat ${paymentTypeLabel(order.payment_type)}.`;
  }
  return STEP_TEXT[status].done;
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
      text: state === 'done' ? doneText(order, status) : state === 'current' ? current : copy.waiting,
      time: state === 'upcoming' ? null : stepTime(order, status),
      state,
    });
  });

  if (terminated) {
    const log = [...logs].reverse().find((l) => l.to_status === order.status);
    // Catatan log tidak ditampilkan mentah (bisa berisi teks teknis Midtrans); alasan penolakan dari kolom pesanan
    const reason =
      order.status === 'ditolak'
        ? order.rejected_reason?.trim()
          ? `Alasan: ${asSentence(order.rejected_reason)}`
          : STEP_TEXT.ditolak.current
        : cancelledText(log);
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
                {step.text && (
                  <p className={`mt-0.5 text-[13px] leading-relaxed ${step.state === 'upcoming' ? 'text-subtle' : 'text-muted'}`}>{step.text}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <HistoryDisclosure logs={logs} />
    </Card>
  );
}

/**
 * Riwayat lengkap (log pesanan) dilipat di bawah timeline, tertutup secara bawaan: isinya sebagian besar mengulang
 * timeline. Teks tiap log dipetakan ke kalimat untuk pembeli (customerHistoryEntry), catatan internal tidak tampil.
 */
function HistoryDisclosure({ logs }: { logs: OrderLog[] }) {
  const entries = [...logs]
    .reverse()
    .map(customerHistoryEntry)
    .filter((entry): entry is HistoryEntry => entry !== null);
  if (entries.length === 0) return null;
  return (
    <details className="group mt-5 border-t border-line pt-2">
      <summary className="-mx-2 flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-[13px] font-medium text-muted transition-colors hover:bg-alt hover:text-fg [&::-webkit-details-marker]:hidden">
        <ScrollText className="h-4 w-4 text-subtle" aria-hidden />
        Lihat riwayat lengkap
        <span className="tabular-nums text-subtle">({entries.length})</span>
        <ChevronDown
          className="ml-auto h-4 w-4 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <ul className="mt-1 divide-y divide-line">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-0.5 py-3 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{entry.title}</p>
              {entry.text && <p className="mt-0.5 break-words text-[13px] text-muted">{entry.text}</p>}
            </div>
            <time className="shrink-0 text-xs tabular-nums text-subtle">{formatTanggal(entry.time, true)}</time>
          </li>
        ))}
      </ul>
    </details>
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
  helpHref,
  onFlash,
  onReload,
}: {
  order: Order;
  site: Site | null;
  simulator: boolean;
  /** Tautan WhatsApp bantuan (pesan awal berisi nomor pesanan) */
  helpHref: string;
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
  // Pesanan ditutup yang tidak pernah dibayar: total tidak boleh terbaca seperti utang
  const notCharged = isNeverCharged(order);
  // Domain tahun pertama dijual terpisah sejak migrasi 026 (sudah termasuk di `price`); pesanan lama = 0
  const domainPrice = order.domain_price ?? 0;

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
          <span className="tabular-nums">{formatRupiah(order.list_price ?? order.price - domainPrice)}</span>
        </Row>
        {(order.discount_amount ?? 0) > 0 && (
          <Row label="Diskon pembelian pertama">
            <span className="tabular-nums text-success-700">-{formatRupiah(order.discount_amount ?? 0)}</span>
          </Row>
        )}
        {domainPrice > 0 && (
          // Nama domain bisa panjang: label yang boleh terlipat, angka tetap utuh di kanan
          <div className="flex items-start justify-between gap-4 py-2">
            <dt className="min-w-0 break-words text-[13px] text-muted">
              Domain {order.domain_primary} <span className="whitespace-nowrap">(1 tahun)</span>
            </dt>
            <dd className="shrink-0 text-right text-sm font-medium tabular-nums text-fg">{formatRupiah(domainPrice)}</dd>
          </div>
        )}
        {notCharged ? (
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm font-medium text-muted">Total (tidak ditagihkan)</dt>
            <dd className="text-base font-medium tabular-nums text-muted">{formatRupiah(order.price)}</dd>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm font-semibold text-fg">Total</dt>
            <dd className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">{formatRupiah(order.price)}</dd>
          </div>
        )}
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
                {paying ? 'Membuka pembayaran...' : 'Bayar Sekarang'}
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
              Kelola Situs
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

        {/* Ditolak (mis. domain tidak tersedia) atau dibatalkan: jalan keluarnya memesan lagi, mis. dengan domain lain */}
        {(order.status === 'dibatalkan' || order.status === 'ditolak') &&
          (order.template_slug ? (
            <Link to={`/pesan/${encodeURIComponent(order.template_slug)}`} className="btn btn-primary w-full">
              Pesan Lagi
            </Link>
          ) : (
            <Link to="/#templates" className="btn btn-primary w-full">
              Pilih Template
            </Link>
          ))}

        {order.status === 'ditolak' && (
          <a href={helpHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Tanya via WhatsApp
            <span className="sr-only">(tab baru)</span>
          </a>
        )}

        {/* Nota resmi tersedia begitu pesanan dibayar (juga yang belum aktif) */}
        {hasOrderInvoice(order) && (
          <Link to={orderInvoicePath(order.order_number)} className="btn btn-outline w-full">
            <FileText className="h-4 w-4" aria-hidden />
            Nota pembelian
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
      {/* Sudah dibayar, situs belum aktif: masa aktif (hosting, SSL, domain) baru dihitung sejak aktif */}
      {(order.status === 'menunggu_approval' || order.status === 'proses_domain') && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Masa aktif dimulai saat situs aktif (1 tahun).
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

/* ─────────────────────────── Masa aktif & perpanjangan ─────────────────────────── */

/** Waktu sekarang, diperbarui tiap menit (hitung mundur) dan saat tab kembali terlihat. Tanpa animasi. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}

const PERIOD_STYLE: Record<PeriodTone, { label: string; pill: string; bar: string; number: string }> = {
  ok: { label: 'Aktif', pill: PAYMENT_TONE_CLASS.success, bar: 'bg-primary', number: 'text-fg' },
  soon: { label: 'Segera berakhir', pill: PAYMENT_TONE_CLASS.warning, bar: 'bg-warning', number: 'text-warning-700' },
  urgent: { label: 'Hampir berakhir', pill: PAYMENT_TONE_CLASS.danger, bar: 'bg-danger', number: 'text-danger-700' },
  expired: { label: 'Berakhir', pill: PAYMENT_TONE_CLASS.danger, bar: 'bg-danger', number: 'text-danger-700' },
};

const RENEWAL_PILL: Record<RenewalStatus, string> = {
  menunggu_pembayaran: PAYMENT_TONE_CLASS.warning,
  lunas: PAYMENT_TONE_CLASS.success,
  dibatalkan: PAYMENT_TONE_CLASS.neutral,
};

function RenewalPill({ status }: { status: RenewalStatus }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${RENEWAL_PILL[status] ?? PAYMENT_TONE_CLASS.neutral}`}
    >
      {RENEWAL_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** "25 Oktober 2026 – 25 Oktober 2027"; di HP label dan tanggal bertumpuk. */
function PeriodRow({ label, start, end }: { label: ReactNode; start?: string | null; end?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="min-w-0 break-words text-[13px] text-muted">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-fg sm:shrink-0 sm:text-right">
        {end ? `${formatTanggal(start)} – ${formatTanggal(end)}` : <span className="font-normal text-subtle">Belum tercatat</span>}
      </dd>
    </div>
  );
}

/** Ke mana fokus dipindah setelah daftar perpanjangan dimuat ulang (tombol yang diklik sudah hilang). */
type FocusAfter = 'pending' | 'card' | null;

interface ActivePeriodCardProps {
  order: Order;
  renewals: Renewal[];
  offer: RenewalOffer | null;
  simulator: boolean;
  helpHref: string;
  onFlash: (flash: Flash | null) => void;
  onReload: () => Promise<void> | void;
}

/**
 * Kartu masa aktif (pesanan aktif): hitung mundur hosting & jasa (diperbarui tiap menit), progres masa yang sudah
 * berjalan, tanggal mulai–berakhir hosting dan domain, peringatan ≤ 30/7 hari atau sudah lewat, lalu perpanjangan:
 * tombol "Perpanjang masa aktif" (dialog 1–3 tahun), tagihan yang menunggu pembayaran, dan riwayatnya.
 */
function ActivePeriodCard({ order, renewals, offer, simulator, helpHref, onFlash, onReload }: ActivePeriodCardProps) {
  const now = useMinuteClock();
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const focusAfterRef = useRef<FocusAfter>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Tagihan baru tanpa link pembayaran (pembayaran online belum dikonfigurasi/gagal dibuat): alasannya tampil di blok tagihan
  const [createdNotice, setCreatedNotice] = useState<{ number: string; text: string } | null>(null);

  const pending = pendingRenewal(renewals);
  const pendingNumber = pending?.renewal_number ?? null;
  const history = renewals.filter((r) => r.status !== 'menunggu_pembayaran');
  const domain = renewalDomain(order);
  const rem = remaining(order.service_expires_at, now);
  const tone: PeriodTone = rem ? periodTone(rem) : 'ok';
  const style = PERIOD_STYLE[tone];
  const elapsed = Math.round(progress(order.service_started_at, order.service_expires_at, now) * 100);
  const warning = rem && order.service_expires_at ? periodWarning(rem, order.service_expires_at) : null;
  const canRenew = Boolean(offer?.available && offer.options.length > 0);
  const maxYears = offer ? Math.max(0, ...offer.options.map((o) => o.years)) : 0;

  useEffect(() => {
    const target = focusAfterRef.current;
    if (target === 'pending' && pendingNumber) {
      focusAfterRef.current = null;
      pendingRef.current?.focus();
    } else if (target === 'card' && !pendingNumber) {
      focusAfterRef.current = null;
      cardRef.current?.focus({ preventScroll: true });
    }
  }, [pendingNumber]);

  const onCreated = async (result: CreateRenewalResult) => {
    setDialogOpen(false);
    setCreatedNotice({
      number: result.renewal.renewal_number,
      text: `Halaman pembayaran belum bisa dibuka: ${result.payment_error?.trim() || 'link pembayaran belum tersedia.'} ${
        simulator
          ? 'Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".'
          : 'Anda bisa mencoba lagi lewat tombol "Bayar Sekarang".'
      }`,
    });
    focusAfterRef.current = 'pending';
    await onReload();
  };

  return (
    <section
      id={ACTIVE_PERIOD_ANCHOR}
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="card-site scroll-mt-24 p-5 focus:outline-none sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
          <CalendarClock className="h-[18px] w-[18px] text-primary" aria-hidden />
          Masa aktif
        </h2>
        {rem && (
          <span
            className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${style.pill}`}
          >
            {style.label}
          </span>
        )}
      </div>

      {rem ? (
        <>
          {/* Hitung mundur: angka berganti tiap menit tanpa animasi; tidak memakai aria-live agar tidak dibacakan terus */}
          {rem.expired ? (
            <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${style.number}`}>{countdownLabel(rem)}</p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`text-4xl font-semibold leading-none tabular-nums tracking-tight sm:text-5xl ${style.number}`}>
                {rem.days}
              </span>
              <span className="text-base font-semibold text-fg">hari</span>
              <span className="text-sm tabular-nums text-muted">{clockText(rem)} lagi</span>
            </p>
          )}
          <div
            role="progressbar"
            aria-label="Masa aktif hosting yang sudah berjalan"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={elapsed}
            aria-valuetext={`${elapsed}% berjalan, ${countdownLabel(rem).toLowerCase()}`}
            className="mt-4 h-2 overflow-hidden rounded-full bg-line"
          >
            <div
              className={`h-full rounded-full ${style.bar} transition-[width] duration-500 motion-reduce:transition-none`}
              style={{ width: `${elapsed}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-muted">Tanggal masa aktif belum tercatat. Tanya tim kami bila perlu kepastian.</p>
      )}

      <dl className="mt-4 divide-y divide-line border-y border-line">
        <PeriodRow label="Hosting & jasa template" start={order.service_started_at} end={order.service_expires_at} />
        <PeriodRow
          label={
            <>
              Domain <span className="font-medium text-fg">{domain}</span>
            </>
          }
          start={order.domain_started_at}
          end={order.domain_expires_at}
        />
      </dl>

      {warning && (
        <Notice tone={tone === 'soon' ? 'warning' : 'danger'} className="mt-4">
          {warning}
        </Notice>
      )}

      <div className="mt-5 empty:hidden">
        {pending ? (
          <PendingRenewal
            containerRef={pendingRef}
            order={order}
            renewal={pending}
            simulator={simulator}
            notice={createdNotice?.number === pending.renewal_number ? createdNotice.text : null}
            onFlash={onFlash}
            onSettled={() => {
              focusAfterRef.current = 'card';
            }}
            onReload={onReload}
          />
        ) : canRenew && offer ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <p className="text-[13px] leading-relaxed text-muted">
              Biaya per tahun <span className="font-medium tabular-nums text-fg">{rupiahCompact(offer.price_per_year ?? 0)}</span>{' '}
              ({renewalBreakdown(offer.hosting_price_per_year, offer.domain_price_per_year, domain)}).
              {maxYears > 1 ? ` Bisa 1–${maxYears} tahun sekaligus.` : ''}
            </p>
            <button type="button" className="btn btn-primary shrink-0 max-sm:w-full" onClick={() => setDialogOpen(true)}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Perpanjang masa aktif
            </button>
          </div>
        ) : offer?.reason ? (
          <div className="rounded-2xl bg-alt px-4 py-3.5">
            <p className="text-[13px] leading-relaxed text-muted">{offer.reason}</p>
            <a href={helpHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-3">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Tanya via WhatsApp
              <span className="sr-only">(tab baru)</span>
            </a>
          </div>
        ) : null}
      </div>

      {history.length > 0 && <RenewalHistory order={order} renewals={history} />}

      {dialogOpen && offer && canRenew && (
        <RenewDialog order={order} offer={offer} onClose={() => setDialogOpen(false)} onCreated={onCreated} />
      )}
    </section>
  );
}

interface PendingRenewalProps {
  containerRef: Ref<HTMLDivElement>;
  order: Order;
  renewal: Renewal;
  simulator: boolean;
  /** Peringatan saat tagihan baru dibuat tanpa link pembayaran */
  notice: string | null;
  onFlash: (flash: Flash | null) => void;
  /** Tagihan akan hilang dari blok ini (lunas/dibatalkan): fokus pindah ke kartu setelah dimuat ulang */
  onSettled: () => void;
  onReload: () => Promise<void> | void;
}

/**
 * Tagihan perpanjangan yang menunggu pembayaran: bayar (Midtrans), simulasi (mode uji), atau batalkan. Pembayaran kartu
 * yang sedang ditinjau bank (payment_status capture) tidak ditawari bayar ulang (backend menolak: PAYMENT_UNDER_REVIEW).
 */
function PendingRenewal({ containerRef, order, renewal, simulator, notice, onFlash, onSettled, onReload }: PendingRenewalProps) {
  const headingId = useId();
  const underReview = renewal.payment_status === 'capture';
  const [busy, setBusy] = useState<'pay' | 'simulate' | 'cancel' | 'reload' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const breakdown = renewalBreakdown(renewal.hosting_price_per_year, renewal.domain_price_per_year, renewal.domain || renewalDomain(order));

  const pay = async () => {
    setBusy('pay');
    setError(null);
    try {
      await payRenewal(renewal.renewal_number);
    } catch (err) {
      const notConfigured = err instanceof ApiError && err.code === 'PAYMENT_NOT_CONFIGURED';
      setError(
        notConfigured && simulator
          ? `${err.message} Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".`
          : errorMessage(err, 'Gagal membuka halaman pembayaran. Silakan coba lagi.'),
      );
      setBusy(null);
    }
  };

  const simulate = async () => {
    setBusy('simulate');
    setError(null);
    try {
      const res = await simulateRenewalPayment(renewal.renewal_number);
      onFlash(renewalPaidFlash(res.order?.service_expires_at ?? res.renewal.service_expires_after));
      onSettled();
      await onReload();
    } catch (err) {
      setError(errorMessage(err, 'Simulasi pembayaran gagal.'));
    } finally {
      setBusy(null);
    }
  };

  const reload = async () => {
    setBusy('reload');
    try {
      await onReload();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy('cancel');
    setCancelError(null);
    try {
      await cancelRenewal(renewal.renewal_number);
      setConfirmOpen(false);
      onFlash({ tone: 'success', text: `Tagihan perpanjangan ${renewal.renewal_number} dibatalkan.` });
      onSettled();
      await onReload();
    } catch (err) {
      setCancelError(errorMessage(err, 'Gagal membatalkan tagihan perpanjangan.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-labelledby={headingId}
      tabIndex={-1}
      className="rounded-2xl bg-alt p-4 ring-1 ring-inset ring-line focus:outline-none sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-semibold text-fg">
            Tagihan perpanjangan {renewal.years} tahun
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            <span className="tabular-nums">{renewal.renewal_number}</span> · Dibuat {formatTanggal(renewal.created_at, true)}
          </p>
        </div>
        <RenewalPill status={renewal.status} />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-fg">{formatRupiah(renewal.price)}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
        {renewal.years > 1 ? `${renewal.years} × (${breakdown})` : `${breakdown} per tahun`}
      </p>

      {notice && (
        <Notice tone="warning" className="mt-3">
          {notice}
        </Notice>
      )}
      {underReview && (
        <Notice
          tone="info"
          className="mt-3"
          title="Pembayaran sedang ditinjau bank"
          action={
            <button type="button" className="btn btn-outline btn-sm" onClick={reload} disabled={busy !== null}>
              <RefreshCw className={`h-4 w-4 ${busy === 'reload' ? 'animate-spin' : ''}`} aria-hidden />
              Periksa lagi
            </button>
          }
        >
          Tidak perlu membayar ulang. Masa aktif bertambah otomatis bila bank menyetujui pembayaran kartu Anda.
        </Notice>
      )}
      {error && (
        <Notice tone="danger" className="mt-3" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!underReview && (
          <button type="button" className="btn btn-primary" onClick={pay} disabled={busy !== null}>
            {busy === 'pay' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
            {busy === 'pay' ? 'Membuka pembayaran...' : 'Bayar Sekarang'}
          </button>
        )}
        {simulator && (
          <button type="button" className="btn btn-secondary" onClick={simulate} disabled={busy !== null}>
            {busy === 'simulate' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FlaskConical className="h-4 w-4" aria-hidden />
            )}
            Simulasikan pembayaran (mode uji)
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost text-danger-700 hover:bg-danger-50 hover:text-danger-700"
          onClick={() => {
            setCancelError(null);
            setConfirmOpen(true);
          }}
          disabled={busy !== null}
        >
          Batalkan
        </button>
      </div>
      <p className="mt-3 text-xs text-subtle">
        {underReview
          ? 'Pembayaran kartu sedang ditinjau bank. Status diperbarui otomatis setelah peninjauan selesai.'
          : 'Pembayaran diproses oleh Midtrans. Masa aktif bertambah otomatis setelah pembayaran berhasil.'}
      </p>

      <ConfirmDialog
        open={confirmOpen}
        title="Batalkan tagihan perpanjangan?"
        description={
          <>
            Tagihan <span className="font-semibold tabular-nums text-fg">{renewal.renewal_number}</span> sebesar{' '}
            <span className="font-semibold tabular-nums text-fg">{formatRupiah(renewal.price)}</span> dibatalkan dan link
            pembayarannya tidak bisa dipakai lagi. Anda bisa membuat tagihan baru kapan saja.
          </>
        }
        confirmLabel="Ya, batalkan"
        cancelLabel="Kembali"
        tone="danger"
        loading={busy === 'cancel'}
        error={cancelError}
        onConfirm={cancel}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

/** Perpanjangan yang sudah lunas atau dibatalkan, terbaru dulu; yang lunas punya nota. */
function RenewalHistory({ order, renewals }: { order: Order; renewals: Renewal[] }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-fg">Riwayat perpanjangan</h3>
      <ul className="mt-1 divide-y divide-line">
        {renewals.map((r) => {
          const paid = r.status === 'lunas';
          return (
            <li key={r.renewal_number} className="flex flex-col gap-2.5 py-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-fg">
                  Perpanjangan {r.years} tahun
                  <RenewalPill status={r.status} />
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  <span className="font-medium tabular-nums text-fg">{formatRupiah(r.price)}</span>
                  {paid && r.paid_at ? ` · Dibayar ${formatTanggal(r.paid_at, true)}` : ''}
                  {!paid && r.cancelled_at ? ` · Dibatalkan ${formatTanggal(r.cancelled_at, true)}` : ''}
                </p>
                {paid && r.service_expires_after && (
                  <p className="mt-0.5 text-[13px] text-muted">Aktif sampai {formatTanggal(r.service_expires_after)}</p>
                )}
              </div>
              {paid && (
                <Link
                  to={renewalInvoicePath(order.order_number, r.renewal_number)}
                  aria-label={`Nota perpanjangan ${r.renewal_number}`}
                  className="btn btn-outline btn-sm shrink-0 self-start sm:self-auto"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Nota
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface RenewDialogProps {
  order: Order;
  offer: RenewalOffer;
  onClose: () => void;
  /** Tagihan dibuat tanpa link pembayaran (dengan link, halaman langsung pindah ke Midtrans) */
  onCreated: (result: CreateRenewalResult) => void;
}

/**
 * Dialog pilihan masa perpanjangan: kartu radio per pilihan dari server (1–3 tahun, yang melewati batas 10 tahun tidak
 * ikut) berisi harga, rincian per tahun, dan tanggal berakhir baru. Pola sama dengan ConfirmDialog: lembar dari bawah di
 * HP, fokus terkunci (mulai di pilihan terpilih), Esc/klik latar = tutup kecuali saat memproses, fokus kembali ke pemicu.
 */
function RenewDialog({ order, offer, onClose, onCreated }: RenewDialogProps) {
  const titleId = useId();
  const descId = useId();
  const radioName = useId();
  const [years, setYears] = useState(() => offer.options[0]?.years ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, {
    initialFocus: 'none',
    onEscape: () => {
      if (!submitting) onClose();
    },
  });
  const domain = renewalDomain(order);
  const breakdown = renewalBreakdown(offer.hosting_price_per_year, offer.domain_price_per_year, domain);
  const selected = offer.options.find((o) => o.years === years) ?? null;

  // Fokus awal di pilihan yang terpilih (Tab berikutnya ke tombol), gulir halaman di belakang dikunci
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [dialogRef]);

  // Saat memproses semua kontrol nonaktif: fokus ke kotak dialog agar tidak jatuh ke <body>
  useEffect(() => {
    if (submitting) dialogRef.current?.focus({ preventScroll: true });
  }, [submitting, dialogRef]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createRenewal(order.order_number, selected.years);
      if (isPaymentUrl(result.payment_url)) {
        goToPayment(result.payment_url); // tetap "memproses" sampai halaman berpindah
        return;
      }
      setSubmitting(false);
      onCreated(result);
    } catch (err) {
      setError(
        err instanceof ApiError && err.fieldErrors?.years
          ? err.fieldErrors.years
          : errorMessage(err, 'Tagihan perpanjangan belum bisa dibuat. Silakan coba lagi.'),
      );
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-fg/30" onClick={() => !submitting && onClose()} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={submitting || undefined}
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float ring-1 ring-line focus:outline-none sm:max-w-lg sm:rounded-[24px] sm:p-6"
      >
        <h2 id={titleId} className="text-base font-semibold text-fg sm:text-lg">
          Perpanjang masa aktif
        </h2>
        <p id={descId} className="mt-1.5 text-sm leading-relaxed text-muted">
          Hosting & jasa template dan domain <span className="break-words font-medium text-fg">{domain}</span> diperpanjang
          bersamaan. Masa aktif bertambah setelah pembayaran berhasil.
        </p>

        <form onSubmit={submit} className="mt-4">
          <fieldset disabled={submitting}>
            <legend className="text-[13px] font-medium text-fg">Pilih masa perpanjangan</legend>
            <div className="mt-2 space-y-2.5">
              {offer.options.map((option) => {
                const checked = option.years === years;
                const domainDiffers = option.domain_expires_after.slice(0, 10) !== option.service_expires_after.slice(0, 10);
                return (
                  <label
                    key={option.years}
                    className={`relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-inset transition-colors has-[:disabled]:cursor-default has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                      checked ? 'bg-brand-50/60 ring-2 ring-primary' : 'bg-surface ring-1 ring-line-strong hover:ring-subtle'
                    }`}
                  >
                    <input
                      type="radio"
                      name={radioName}
                      value={option.years}
                      checked={checked}
                      onChange={() => setYears(option.years)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                        checked ? 'bg-primary' : 'bg-surface ring-1 ring-inset ring-line-strong'
                      }`}
                    >
                      {checked && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-[15px] font-semibold text-fg">{option.years} tahun</span>
                        <span className="text-[15px] font-semibold tabular-nums text-fg">{formatRupiah(option.price)}</span>
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                        {option.years > 1 ? `${option.years} × (${breakdown})` : `${breakdown} per tahun`}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium text-fg">
                        Aktif sampai {shortDate(option.service_expires_after)}
                        {domainDiffers ? ` · domain sampai ${shortDate(option.domain_expires_after)}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !selected}>
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
              Lanjut ke pembayaran
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-subtle sm:text-right">Pembayaran diproses oleh Midtrans.</p>
        </form>
      </div>
    </div>,
    document.body,
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
