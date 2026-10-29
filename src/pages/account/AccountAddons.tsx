// Menu Fitur tambahan (/akun/fitur), docs/platform/SITE-ADDONS-SPEC.md §5: kartu fitur Berita & Pengumuman (harga
// sekali bayar, manfaat, contoh tampilan) lalu satu baris per situs pembeli yang templatenya mampu (template sekolah):
// Terkunci → "Beli & aktifkan" (tagihan GNF-… lalu Midtrans), Menunggu pembayaran → bayar / simulasi (mode uji) /
// batalkan, Aktif → kelola berita & nota. ?situs=ID menggulir & memfokuskan baris situs itu. Kembali dari Midtrans
// (?order_id=GNF-…&transaction_status=…) daftar dimuat ulang tiap 10 detik maks. 2 menit sampai lunas (pola perpanjangan).
// Aksi baris (buat tagihan, bayar, simulasi, batalkan) memberi toast sukses/gagal milik halaman; pindah ke Midtrans
// tidak perlu toast.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  FlaskConical,
  LoaderCircle,
  Lock,
  Newspaper,
  PenLine,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ApiError, apiGet, errorMessage } from '../../lib/api';
import { categoryPath } from '../../seo/paths';
import { POST_TEMPLATE_CODES } from '../../templates/postTemplates';
import { formatRupiah, formatTanggal, type PaymentConfig } from '../../types/platform';
import { ADDON_POSTS_PRICE_DEFAULT, SITE_ADDON_NAME, type SiteAddonsResponse, type SiteAddonSite, type SiteAddonState } from '../../types/siteAddons';
import {
  addonDemoPath,
  addonInvoicePath,
  addonNumberFromReturn,
  addonRowId,
  buySiteAddon,
  cancelSiteAddon,
  fetchSiteAddons,
  paySiteAddon,
  postsAddonOf,
  simulateSiteAddonPayment,
} from './components/addons';
import { Toast, type ToastTone } from './cms/Toast';
import { useToast } from './cms/useToast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Notice, type NoticeTone } from './components/Notice';
import { goToPayment, isPaymentUrl, useDocumentTitle } from './components/payment';
import { paymentStatusLabel } from './components/paymentStatus';
import { EmptyState, ErrorState, Skeleton } from './components/States';
import { siteLinks } from './posts/siteLinks';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: SiteAddonsResponse };

/** Toast milik halaman, dipanggil baris situs (baris tidak merender <Toast> sendiri). */
type Notify = (tone: ToastTone, message: string, description?: string) => void;

const FAIL_TEXT = 'Terjadi kesalahan. Coba lagi.';

interface Flash {
  tone: NoticeTone;
  title?: string;
  text: string;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 12; // 2 menit
const FAILED_TX = new Set(['deny', 'cancel', 'expire', 'failure']);
// Midtrans sudah menerima pembayaran di halamannya; aktif atau tidaknya tetap ditentukan server ('capture' bisa ditahan)
const SUBMITTED_TX = new Set(['settlement', 'capture', 'simulated']);
const ADDON_NAME = SITE_ADDON_NAME.posts;

const BENEFITS = [
  'Halaman berita & pengumuman sendiri di situs Anda',
  'Foto, kategori, dan label Penting di setiap tulisan',
  'SEO per tulisan, siap tampil di Google',
  'Jumlah dilihat untuk setiap tulisan',
  'Tampilan berita & pengumuman beranda yang lebih profesional',
];

const activatedFlash = (domain: string): Flash => ({
  tone: 'success',
  title: 'Pembayaran berhasil',
  text: `Fitur ${ADDON_NAME} aktif. Kelola tulisan ${domain} lewat tombol "Kelola berita".`,
});

/** Situs yang tampil di halaman ini: hanya template mampu (template sekolah). */
const capableSites = (data: SiteAddonsResponse) =>
  data.sites.flatMap((site) => {
    const addon = postsAddonOf(site);
    return addon ? [{ site, addon }] : [];
  });

/** Tagihan dari URL kembali Midtrans: masih menunggu, sudah aktif (lunas), atau tidak ada lagi (mis. dibatalkan). */
function findReturned(data: SiteAddonsResponse, addonNumber: string): { site: SiteAddonSite; state: 'pending' | 'paid' } | null {
  for (const { site, addon } of capableSites(data)) {
    if (addon.pending?.addon_number === addonNumber) return { site, state: 'pending' };
    if (addon.purchase?.addon_number === addonNumber && addon.active) return { site, state: 'paid' };
  }
  return null;
}

export default function AccountAddons() {
  useDocumentTitle('Fitur tambahan');
  const [params] = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const notify: Notify = (tone, message, description) => showToast(tone, message, undefined, description);

  // Kembali dari halaman Midtrans (callbacks.finish = /akun/fitur, Midtrans menambahkan order_id & transaction_status)
  const returnNumber = addonNumberFromReturn(params.get('order_id'));
  const returnTx = params.get('transaction_status')?.toLowerCase() ?? null;
  const [polls, setPolls] = useState(0);
  const flashedRef = useRef(false);

  // ?situs=ID: baris situs yang dituju (dari panel situs, halaman berita terkunci)
  const rawFocus = params.get('situs');
  const focusSiteId = /^\d+$/.test(rawFocus ?? '') ? Number(rawFocus) : 0;
  const focusedRef = useRef(0); // situs yang sudah difokuskan (sekali per ?situs=)

  const apply = useCallback(
    (data: SiteAddonsResponse) => {
      setState({ status: 'ready', data: { sites: Array.isArray(data.sites) ? data.sites : [], price: data.price ?? { posts: ADDON_POSTS_PRICE_DEFAULT } } });
      // Kembali dari pembayaran: pemberitahuan sekali saja, baik sudah lunas saat dimuat maupun setelah dimuat ulang
      if (returnNumber && !flashedRef.current) {
        const returned = findReturned(data, returnNumber);
        if (returned?.state === 'paid') {
          flashedRef.current = true;
          setFlash(activatedFlash(returned.site.domain));
        }
      }
    },
    [returnNumber],
  );

  useEffect(() => {
    let alive = true;
    flashedRef.current = false;
    fetchSiteAddons()
      .then((data) => alive && apply(data))
      .catch((err: unknown) => alive && setState({ status: 'error', message: errorMessage(err, 'Fitur tambahan belum bisa dimuat. Silakan coba lagi.') }));
    return () => {
      alive = false;
    };
  }, [apply]);

  // Tombol simulasi hanya bila simulator pembayaran aktif (lokal/uji)
  useEffect(() => {
    let alive = true;
    apiGet<PaymentConfig>('get_payment_config')
      .then((cfg) => alive && setConfig(cfg))
      .catch(() => alive && setConfig(null));
    return () => {
      alive = false;
    };
  }, []);

  /** Muat ulang (tombol, setelah aksi, atau polling). Gagal saat daftar sudah tampil → pemberitahuan saja. */
  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        apply(await fetchSiteAddons());
      } catch (err) {
        if (!silent) setFlash({ tone: 'danger', text: errorMessage(err, 'Gagal memuat ulang fitur tambahan.') });
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [apply],
  );

  const retryLoad = () => {
    setState({ status: 'loading' });
    fetchSiteAddons()
      .then(apply)
      .catch((err: unknown) => setState({ status: 'error', message: errorMessage(err, 'Fitur tambahan belum bisa dimuat. Silakan coba lagi.') }));
  };

  const data = state.status === 'ready' ? state.data : null;
  const returned = data && returnNumber ? findReturned(data, returnNumber) : null;
  const failedTx = returnTx !== null && FAILED_TX.has(returnTx);
  const awaiting = returned?.state === 'pending' && !failedTx;
  const polling = awaiting && polls < MAX_POLLS;
  const pollsExhausted = awaiting && polls >= MAX_POLLS;

  useEffect(() => {
    if (!polling) return;
    const id = window.setTimeout(async () => {
      if (document.visibilityState === 'visible') await reload(true);
      setPolls((n) => n + 1);
    }, POLL_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [polling, polls, reload]);

  // ?situs=ID: gulir & fokus ke baris situs itu sekali, begitu daftar tampil
  useEffect(() => {
    if (!data || !focusSiteId || focusedRef.current === focusSiteId) return;
    focusedRef.current = focusSiteId;
    const row = document.getElementById(addonRowId(focusSiteId));
    if (!row) return;
    row.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    row.focus({ preventScroll: true });
  }, [data, focusSiteId]);

  const sites = data ? capableSites(data) : [];
  const price = data?.price?.posts || sites[0]?.addon.price || ADDON_POSTS_PRICE_DEFAULT;
  // Contoh tampilan: template sekolah situs pembeli, bila belum punya template sekolah pertama
  const demoCode = sites[0]?.site.template_code ?? POST_TEMPLATE_CODES[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[32px]">Fitur tambahan</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-muted sm:text-base">
          Tambahkan kemampuan baru ke situs Anda. Bayar sekali, fitur langsung aktif di panel situs setelah pembayaran lunas.
        </p>
      </header>

      <div className="mt-6 space-y-3 empty:hidden">
        {flash && (
          <Notice tone={flash.tone} title={flash.title} onClose={() => setFlash(null)}>
            {flash.text}
          </Notice>
        )}
        {returned?.state === 'pending' && (
          <ReturnNotice tx={returnTx} polling={polling} pollsExhausted={pollsExhausted} refreshing={refreshing} onReload={() => reload()} />
        )}
      </div>

      <div aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <AddonsSkeleton />}
        {state.status === 'error' && <ErrorState title="Fitur tambahan belum bisa dimuat" message={state.message} onRetry={retryLoad} className="mt-6" />}

        {state.status === 'ready' && (
          <>
            <FeatureCard price={price} demoHref={addonDemoPath(demoCode)} />

            <section aria-labelledby="addon-sites-title" className="mt-8 sm:mt-10">
              <h2 id="addon-sites-title" className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
                Situs Anda
              </h2>
              {sites.length === 0 ? (
                <NoCapableSite />
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted">Aktifkan per situs. Situs dengan template lain tidak ditampilkan di sini.</p>
                  <ul className="mt-4 space-y-3">
                    {sites.map(({ site, addon }) => (
                      <li key={site.site_id}>
                        <SiteRow
                          site={site}
                          addon={addon}
                          targeted={site.site_id === focusSiteId}
                          simulator={Boolean(config?.simulator)}
                          onReload={() => reload(true)}
                          onActivated={(domain) => setFlash(activatedFlash(domain))}
                          notify={notify}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </div>
      <Toast toast={toast} onClose={dismissToast} />
    </div>
  );
}

/* ─────────────────────────── Kartu fitur ─────────────────────────── */

function FeatureCard({ price, demoHref }: { price: number; demoHref: string }) {
  return (
    <section aria-labelledby="addon-posts-title" className="card-site mt-6 overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary" aria-hidden>
              <Newspaper className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary">Template sekolah</p>
              <h2 id="addon-posts-title" className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
                {ADDON_NAME}
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Tanpa fitur ini, situs menampilkan berita biasa dari isian konten. Setelah aktif, berita &amp; pengumuman tampil
            profesional dengan halaman sendiri, dan Anda mengelolanya dari menu Berita &amp; Pengumuman di panel situs.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-fg">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700" aria-hidden>
                  <Check className="h-3.5 w-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-alt p-5 ring-1 ring-inset ring-line">
          <div>
            <p className="text-[13px] text-muted">Harga</p>
            <p className="mt-0.5 text-[28px] font-semibold tabular-nums leading-tight tracking-tight text-fg">{formatRupiah(price)}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">Sekali bayar, aktif selama situs aktif.</p>
          </div>
          <a href={demoHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Lihat contoh tampilan
            <span className="sr-only">(tab baru)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function NoCapableSite() {
  return (
    <EmptyState
      className="mt-4"
      icon={<Newspaper className="h-7 w-7" aria-hidden />}
      title="Belum ada situs template sekolah"
      description={`Fitur ${ADDON_NAME} khusus untuk situs dengan template sekolah. Situs dengan template lain tetap bisa mengatur konten dan SEO seperti biasa.`}
      action={
        <Link to={categoryPath('sekolah-pendidikan')} className="btn btn-primary">
          Lihat template sekolah
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      }
    />
  );
}

/* ─────────────────────────── Kembali dari Midtrans ─────────────────────────── */

function ReturnNotice({
  tx,
  polling,
  pollsExhausted,
  refreshing,
  onReload,
}: {
  tx: string | null;
  polling: boolean;
  pollsExhausted: boolean;
  refreshing: boolean;
  onReload: () => void;
}) {
  if (tx && FAILED_TX.has(tx)) {
    return (
      <Notice tone="warning" title="Pembayaran fitur belum berhasil">
        Status dari Midtrans: {paymentStatusLabel(tx)}. Tagihan Anda tetap berlaku; bayar lagi lewat tombol "Bayar Sekarang" di
        baris situsnya.
      </Notice>
    );
  }
  if (polling) {
    return (
      <Notice
        tone="info"
        title={tx && SUBMITTED_TX.has(tx) ? 'Pembayaran sedang dikonfirmasi' : 'Menunggu konfirmasi pembayaran'}
        action={
          <button type="button" className="btn btn-outline btn-sm" onClick={onReload} disabled={refreshing}>
            {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Periksa sekarang
          </button>
        }
      >
        {tx === 'pending' ? 'Selesaikan pembayaran sesuai instruksi di halaman Midtrans (mis. transfer ke nomor virtual account). ' : ''}
        Fitur aktif otomatis setelah pembayaran dikonfirmasi; status diperbarui setiap 10 detik.
      </Notice>
    );
  }
  if (pollsExhausted) {
    return (
      <Notice
        tone="info"
        title="Konfirmasi pembayaran belum kami terima"
        action={
          <button type="button" className="btn btn-outline btn-sm" onClick={onReload} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Periksa lagi
          </button>
        }
      >
        Bila Anda sudah membayar, konfirmasi biasanya masuk dalam beberapa menit. Periksa lagi nanti.
      </Notice>
    );
  }
  return null;
}

/* ─────────────────────────── Baris situs ─────────────────────────── */

type RowStatus = 'active' | 'pending' | 'review' | 'locked';

const rowStatusOf = (addon: SiteAddonState): RowStatus =>
  addon.active ? 'active' : addon.pending ? (addon.pending.payment_status === 'capture' ? 'review' : 'pending') : 'locked';

const ROW_PILL: Record<RowStatus, { label: string; className: string; dot: string }> = {
  active: { label: 'Aktif', className: 'bg-success-50 text-success-700 ring-success/25', dot: 'bg-success' },
  pending: { label: 'Menunggu pembayaran', className: 'bg-warning-50 text-warning-700 ring-warning/25', dot: 'bg-warning' },
  review: { label: 'Ditinjau bank', className: 'bg-warning-50 text-warning-700 ring-warning/25', dot: 'bg-warning' },
  locked: { label: 'Terkunci', className: 'bg-alt text-muted ring-line', dot: 'bg-subtle' },
};

const SOURCE_NOTE: Record<string, string> = {
  admin: 'Diaktifkan gratis oleh tim kami.',
  migrasi: 'Gratis, karena situs ini sudah memakai berita sebelum fitur ini berbayar.',
};

function RowPill({ status }: { status: RowStatus }) {
  const pill = ROW_PILL[status];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${pill.className}`}
    >
      {status === 'locked' ? <Lock className="h-3 w-3" aria-hidden /> : <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden />}
      {pill.label}
    </span>
  );
}

interface SiteRowProps {
  site: SiteAddonSite;
  addon: SiteAddonState;
  /** Baris yang dituju ?situs=ID: garis brand supaya terlihat setelah digulir ke sana */
  targeted: boolean;
  simulator: boolean;
  onReload: () => Promise<void>;
  onActivated: (domain: string) => void;
  notify: Notify;
}

type Busy = 'buy' | 'pay' | 'simulate' | 'cancel' | 'reload' | null;

/**
 * Satu situs: status fitur dan aksinya. Pesan aksi (gagal, tagihan dibuat tanpa link pembayaran, dibatalkan) tampil di
 * baris ini, ditambah toast sukses/gagal halaman (notify). Bila tombol yang ditekan hilang setelah dimuat ulang (mis.
 * Beli → menunggu, Batalkan → terkunci), fokus pindah ke baris (tidak jatuh ke <body>).
 */
function SiteRow({ site, addon, targeted, simulator, onReload, onActivated, notify }: SiteRowProps) {
  const titleId = useId();
  const rowRef = useRef<HTMLElement>(null);
  const status = rowStatusOf(addon);
  const pending = addon.pending;
  const purchase = addon.purchase;
  const suspended = site.site_status !== 'active';
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const simulatorHint = (text: string) => (simulator ? `${text} Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".` : text);

  const refreshAndFocus = async () => {
    await onReload();
    rowRef.current?.focus({ preventScroll: true });
  };

  const buy = async () => {
    setBusy('buy');
    setMessage(null);
    try {
      const res = await buySiteAddon(site.site_id, 'posts');
      if (isPaymentUrl(res.payment_url)) {
        goToPayment(res.payment_url);
        return; // tetap "memproses" sampai pindah ke Midtrans
      }
      setMessage({
        tone: 'warning',
        text: simulatorHint(
          `Tagihan ${res.addon_order.addon_number} dibuat, tetapi halaman pembayaran belum bisa dibuka: ${
            res.payment_error?.trim() || 'link pembayaran belum tersedia.'
          } Coba lagi lewat tombol "Bayar Sekarang".`,
        ),
      });
      notify('success', `Tagihan ${res.addon_order.addon_number} berhasil dibuat.`);
      await refreshAndFocus();
    } catch (err) {
      const stale = err instanceof ApiError && ['ADDON_ACTIVE', 'ADDON_PENDING', 'SITE_SUSPENDED'].includes(err.code ?? '');
      setMessage({ tone: stale ? 'warning' : 'danger', text: errorMessage(err, 'Tagihan fitur gagal dibuat. Silakan coba lagi.') });
      notify('danger', 'Gagal membuat tagihan fitur.', errorMessage(err, FAIL_TEXT));
      // Keadaan di server berbeda dari yang tampil (sudah aktif / sudah ada tagihan / situs nonaktif): segarkan
      if (stale) await refreshAndFocus();
    }
    setBusy(null);
  };

  const pay = async () => {
    if (!pending) return;
    setBusy('pay');
    setMessage(null);
    try {
      await paySiteAddon(pending.addon_number);
      return;
    } catch (err) {
      notify('danger', 'Gagal membuka halaman pembayaran.', errorMessage(err, FAIL_TEXT));
      if (err instanceof ApiError && err.code === 'PAYMENT_UNDER_REVIEW') {
        setMessage({ tone: 'warning', text: err.message });
        await refreshAndFocus();
      } else {
        const notConfigured = err instanceof ApiError && err.code === 'PAYMENT_NOT_CONFIGURED';
        setMessage({
          tone: 'danger',
          text: notConfigured ? simulatorHint(err.message) : errorMessage(err, 'Gagal membuka halaman pembayaran. Silakan coba lagi.'),
        });
      }
    }
    setBusy(null);
  };

  const simulate = async () => {
    if (!pending) return;
    setBusy('simulate');
    setMessage(null);
    try {
      await simulateSiteAddonPayment(pending.addon_number);
      onActivated(site.domain);
      notify('success', `Simulasi pembayaran ${pending.addon_number} berhasil.`);
      await refreshAndFocus();
    } catch (err) {
      setMessage({ tone: 'danger', text: errorMessage(err, 'Simulasi pembayaran gagal.') });
      notify('danger', 'Gagal menjalankan simulasi pembayaran.', errorMessage(err, FAIL_TEXT));
    }
    setBusy(null);
  };

  const recheck = async () => {
    setBusy('reload');
    await onReload();
    setBusy(null);
  };

  const cancel = async () => {
    if (!pending) return;
    setBusy('cancel');
    setCancelError(null);
    try {
      await cancelSiteAddon(pending.addon_number);
      setConfirmOpen(false);
      setMessage({ tone: 'success', text: `Tagihan ${pending.addon_number} dibatalkan. Anda bisa membeli fitur ini lagi kapan saja.` });
      notify('success', `Tagihan ${pending.addon_number} berhasil dibatalkan.`);
      await refreshAndFocus();
    } catch (err) {
      setCancelError(errorMessage(err, 'Gagal membatalkan tagihan fitur.'));
      notify('danger', 'Gagal membatalkan tagihan fitur.', errorMessage(err, FAIL_TEXT));
    }
    setBusy(null);
  };

  const links = siteLinks(site.site_id);

  return (
    <article
      ref={rowRef}
      id={addonRowId(site.site_id)}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={`card-site scroll-mt-24 p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5 ${targeted ? 'ring-primary' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="break-all text-[15px] font-semibold leading-snug text-fg">
            {site.domain}
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            {site.template_name} · <span className="tabular-nums">{site.order_number}</span>
          </p>
        </div>
        <RowPill status={status} />
      </div>

      {message && (
        <Notice tone={message.tone} className="mt-3" onClose={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}

      {status === 'locked' && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted">
            {suspended
              ? 'Situs ini sedang dinonaktifkan. Fitur bisa dibeli setelah situs aktif kembali.'
              : 'Situs ini menampilkan berita biasa. Aktifkan untuk halaman berita & pengumuman sendiri dan tampilan profesional.'}
          </p>
          <button
            type="button"
            className="btn btn-primary shrink-0 max-sm:w-full"
            onClick={buy}
            disabled={busy !== null || suspended}
            aria-describedby={titleId}
          >
            {busy === 'buy' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {busy === 'buy' ? 'Membuat tagihan...' : 'Beli & aktifkan'}
          </button>
        </div>
      )}

      {(status === 'pending' || status === 'review') && pending && (
        <div className="mt-3 rounded-2xl bg-alt p-4 ring-1 ring-inset ring-line">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs text-subtle">
              Tagihan <span className="tabular-nums">{pending.addon_number}</span> · Dibuat {formatTanggal(pending.created_at, true)}
            </p>
            <p className="text-lg font-semibold tabular-nums tracking-tight text-fg">{formatRupiah(pending.price)}</p>
          </div>

          {status === 'review' && (
            <Notice
              tone="info"
              className="mt-3"
              title="Pembayaran sedang ditinjau bank"
              action={
                <button type="button" className="btn btn-outline btn-sm" onClick={recheck} disabled={busy !== null}>
                  <RefreshCw className={`h-4 w-4 ${busy === 'reload' ? 'animate-spin' : ''}`} aria-hidden />
                  Periksa lagi
                </button>
              }
            >
              Tidak perlu membayar ulang. Fitur aktif otomatis bila bank menyetujui pembayaran kartu Anda.
            </Notice>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {status === 'pending' && (
              <button type="button" className="btn btn-primary" onClick={pay} disabled={busy !== null} aria-describedby={titleId}>
                {busy === 'pay' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
                {busy === 'pay' ? 'Membuka pembayaran...' : 'Bayar Sekarang'}
              </button>
            )}
            {simulator && (
              <button type="button" className="btn btn-secondary" onClick={simulate} disabled={busy !== null} aria-describedby={titleId}>
                {busy === 'simulate' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
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
              aria-describedby={titleId}
            >
              Batalkan
            </button>
          </div>
          <p className="mt-3 text-xs text-subtle">
            {status === 'review'
              ? 'Pembayaran kartu sedang ditinjau bank. Status diperbarui setelah peninjauan selesai.'
              : 'Pembayaran diproses oleh Midtrans. Fitur aktif otomatis setelah pembayaran berhasil.'}
          </p>

          <ConfirmDialog
            open={confirmOpen}
            title="Batalkan tagihan fitur?"
            description={
              <>
                Tagihan <span className="font-semibold tabular-nums text-fg">{pending.addon_number}</span> sebesar{' '}
                <span className="font-semibold tabular-nums text-fg">{formatRupiah(pending.price)}</span> untuk {site.domain} dibatalkan dan
                link pembayarannya tidak bisa dipakai lagi. Anda bisa membeli fitur ini lagi kapan saja.
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
      )}

      {status === 'active' && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-relaxed text-muted">
            <p>
              Aktif sejak <span className="font-medium text-fg">{formatTanggal(addon.activated_at)}</span>.
            </p>
            {addon.source && SOURCE_NOTE[addon.source] && <p className="text-[13px] text-subtle">{SOURCE_NOTE[addon.source]}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 max-sm:[&>*]:flex-1">
            <Link to={links.posts} className="btn btn-primary" aria-describedby={titleId}>
              <PenLine className="h-4 w-4" aria-hidden />
              Kelola berita
            </Link>
            {purchase?.invoice_number && (
              <Link to={addonInvoicePath(site.order_number, purchase.addon_number)} className="btn btn-outline" aria-describedby={titleId}>
                <FileText className="h-4 w-4" aria-hidden />
                Lihat nota
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function AddonsSkeleton() {
  return (
    <div role="status" aria-label="Memuat fitur tambahan" className="mt-6">
      <div className="card-site grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <Skeleton className="h-11 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="mt-8 h-6 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card-site space-y-2 p-4 sm:p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
