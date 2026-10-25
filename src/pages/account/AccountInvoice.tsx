// Nota resmi pembeli (/akun/pesanan/:orderNumber/nota dan …/nota/:renewalNumber): nota pembelian template atau nota
// perpanjangan masa aktif dari customer_get_invoice, ditampilkan sebagai kertas A4 dengan mesin dokumen proyek
// (DocumentPreview), bisa dicetak (window.print → salinan cetak A4 dari DocumentPreview) dan diunduh sebagai PDF.
// docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §6. Nota hanya ada setelah lunas (409 INVOICE_NOT_AVAILABLE).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, LoaderCircle, Printer, ReceiptText } from 'lucide-react';
import { DocumentPreview, exportPdf } from '../../features/project-docs/engine';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import { formatTanggal } from '../../types/platform';
import { buildInvoiceModel, invoiceFileName, invoiceNumberOf, invoiceStatusView, type InvoiceData } from './components/invoiceModel';
import { Notice } from './components/Notice';
import { useDocumentTitle } from './components/payment';
import { PAYMENT_TONE_CLASS } from './components/paymentStatus';
import { EmptyState, ErrorState, Skeleton } from './components/States';

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found'; what: 'order' | 'renewal' }
  | { status: 'not_available'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: InvoiceData };

const NOT_AVAILABLE_TEXT = 'Nota tersedia setelah pembayaran lunas.';

/** 404 → tidak ditemukan (pesanan atau tagihan perpanjangan), 409 → nota belum tersedia, lainnya → galat + coba lagi. */
function toState(err: unknown): LoadState {
  if (err instanceof ApiError && err.status === 404) return { status: 'not_found', what: err.code === 'RENEWAL_NOT_FOUND' ? 'renewal' : 'order' };
  if (err instanceof ApiError && err.status === 409) return { status: 'not_available', message: err.message || NOT_AVAILABLE_TEXT };
  return { status: 'error', message: errorMessage(err, 'Nota belum bisa dimuat. Silakan coba lagi.') };
}

export default function AccountInvoice() {
  const { orderNumber = '', renewalNumber = '' } = useParams();
  const orderPath = `/akun/pesanan/${orderNumber}`;
  // Hasil dimuat per alamat: berpindah dari nota pembelian ke nota perpanjangan (komponen yang sama) langsung "memuat"
  const requestKey = `${orderNumber}/${renewalNumber}`;
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null);
  const state: LoadState = !orderNumber
    ? { status: 'not_found', what: 'order' }
    : loaded?.key === requestKey
      ? loaded.state
      : { status: 'loading' };

  const number = state.status === 'ready' ? invoiceNumberOf(state.data.order, state.data.renewal) : null;
  useDocumentTitle(number ? `Nota ${number}` : 'Nota');

  const fetchInvoice = useCallback(
    () =>
      apiPost<InvoiceData>('customer_get_invoice', {
        order_number: orderNumber,
        ...(renewalNumber ? { renewal_number: renewalNumber } : {}),
      }),
    [orderNumber, renewalNumber],
  );

  useEffect(() => {
    if (!orderNumber) return;
    let alive = true;
    fetchInvoice()
      .then((data) => alive && setLoaded({ key: requestKey, state: { status: 'ready', data } }))
      .catch((err: unknown) => alive && setLoaded({ key: requestKey, state: toState(err) }));
    return () => {
      alive = false;
    };
  }, [orderNumber, requestKey, fetchInvoice]);

  // "Coba lagi": kembali ke kerangka memuat lalu minta ulang
  const retry = async () => {
    setLoaded(null);
    try {
      setLoaded({ key: requestKey, state: { status: 'ready', data: await fetchInvoice() } });
    } catch (err) {
      setLoaded({ key: requestKey, state: toState(err) });
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-4 sm:px-8 sm:pb-20 sm:pt-8">
      <Link to={orderNumber ? orderPath : '/akun'} className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {orderNumber ? 'Detail pesanan' : 'Pesanan saya'}
      </Link>

      <div className="mt-3" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <InvoiceSkeleton />}

        {state.status === 'error' && <ErrorState title="Nota belum bisa dimuat" message={state.message} onRetry={retry} />}

        {state.status === 'not_found' &&
          (state.what === 'renewal' ? (
            <EmptyState
              icon={<ReceiptText className="h-7 w-7" aria-hidden />}
              title="Nota tidak ditemukan"
              description={`Tagihan perpanjangan ${renewalNumber} tidak ada di pesanan ${orderNumber}.`}
              action={
                <Link to={orderPath} className="btn btn-primary">
                  Kembali ke detail pesanan
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<ReceiptText className="h-7 w-7" aria-hidden />}
              title="Pesanan tidak ditemukan"
              description={`Pesanan ${orderNumber || 'ini'} tidak ada di akun Anda. Periksa kembali nomor pesanannya.`}
              action={
                <Link to="/akun" className="btn btn-primary">
                  Kembali ke pesanan saya
                </Link>
              }
            />
          ))}

        {state.status === 'not_available' && (
          <EmptyState
            icon={<ReceiptText className="h-7 w-7" aria-hidden />}
            title="Nota belum tersedia"
            description={state.message}
            action={
              <Link to={orderPath} className="btn btn-primary">
                Kembali ke detail pesanan
              </Link>
            }
          />
        )}

        {state.status === 'ready' && <InvoiceView data={state.data} />}
      </div>
    </div>
  );
}

/* ─────────────────────────── Tampilan nota ─────────────────────────── */

function InvoiceView({ data }: { data: InvoiceData }) {
  const { order, renewal } = data;
  const model = useMemo(() => buildInvoiceModel(data), [data]);
  const number = model.meta.number;
  const payment = invoiceStatusView(order, renewal);
  const paidAt = renewal ? renewal.paid_at : order.paid_at;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const download = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportPdf(model, invoiceFileName(number));
    } catch (err) {
      setExportError(`Gagal mengunduh PDF: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            No. nota <span className="break-all font-medium tabular-nums text-fg">{number}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{renewal ? 'Nota perpanjangan' : 'Nota pembelian'}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_TONE_CLASS[payment.tone]}`}
            >
              {payment.label}
            </span>
            <span className="text-xs text-subtle">
              {order.template_name}
              {paidAt ? ` · Dibayar ${formatTanggal(paidAt, true)}` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Aksi nota">
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Cetak
          </button>
          <button type="button" className="btn btn-primary" onClick={download} disabled={exporting}>
            {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {exporting ? 'Menyiapkan PDF...' : 'Unduh PDF'}
          </button>
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        {exporting ? 'Menyiapkan PDF nota.' : ''}
      </p>

      {exportError && (
        <Notice tone="danger" onClose={() => setExportError(null)} className="mt-5">
          {exportError}
        </Notice>
      )}

      <section aria-label="Pratinjau nota" className="mt-6 min-w-0 rounded-[24px] bg-alt p-2.5 ring-1 ring-inset ring-line sm:p-4">
        <DocumentPreview model={model} />
      </section>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Nota diterbitkan secara elektronik dan sah tanpa tanda tangan. Simpan PDF-nya untuk arsip atau pembukuan Anda.
      </p>
    </>
  );
}

function InvoiceSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-3 h-8 w-2/3 sm:h-10" />
      <Skeleton className="mt-3 h-6 w-48" />
      <div className="mt-6 rounded-[24px] bg-alt p-4 ring-1 ring-inset ring-line">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[640px] bg-surface" />
      </div>
    </div>
  );
}
