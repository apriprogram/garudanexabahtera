// Menu Nota (/akun/nota): semua nota pembeli dari customer_get_invoices — nota pembelian template (pesanan yang sudah
// dibayar), nota perpanjangan (tagihan perpanjangan lunas), dan nota fitur tambahan (tagihan GNF-… lunas berbayar),
// terbaru dulu. Tiap baris membuka nota resminya (/akun/pesanan/:no/nota[/:dokumen], AccountInvoice) yang bisa dicetak
// atau diunduh PDF.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarSync, FileText, LayoutTemplate, Sparkles, type LucideIcon } from 'lucide-react';
import { ApiError, apiGet, errorMessage } from '../../lib/api';
import { formatRupiah, formatTanggal, type CustomerInvoiceItem } from '../../types/platform';
import { useDocumentTitle } from './components/payment';
import { invoiceItemStatus, invoicePath } from './components/invoiceList';
import { PAYMENT_TONE_CLASS } from './components/paymentStatus';
import { EmptyState, ErrorState, Skeleton } from './components/States';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; invoices: CustomerInvoiceItem[] };

export default function AccountInvoices() {
  useDocumentTitle('Nota');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGet<{ invoices?: CustomerInvoiceItem[] }>('customer_get_invoices')
      .then((data) => alive && setState({ status: 'ready', invoices: Array.isArray(data.invoices) ? data.invoices : [] }))
      .catch(
        (err: unknown) =>
          alive &&
          setState({
            status: 'error',
            message:
              err instanceof ApiError && err.code === 'NETWORK' ? err.message : errorMessage(err, 'Daftar nota belum bisa dimuat. Silakan coba lagi.'),
          }),
      );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[32px]">Nota</h1>
        <p className="mt-1.5 text-[14px] text-muted sm:text-base">
          Nota resmi PT Garuda Nexa Bahtera untuk pembelian template, perpanjangan masa aktif, dan fitur tambahan. Buka untuk
          mencetak atau mengunduh PDF.
        </p>
      </header>

      <section aria-label="Daftar nota" className="mt-6 sm:mt-8" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="card-site flex items-center gap-4 p-4 sm:p-5">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && <ErrorState title="Nota belum bisa dimuat" message={state.message} onRetry={retry} />}

        {state.status === 'ready' && state.invoices.length === 0 && (
          <EmptyState
            icon={<FileText className="h-7 w-7" aria-hidden />}
            title="Belum ada nota"
            description="Nota terbit otomatis setelah pembayaran pesanan, perpanjangan, atau fitur tambahan lunas."
            action={
              <Link to="/akun/pesanan" className="btn btn-primary">
                Lihat pesanan saya
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
        )}

        {state.status === 'ready' && state.invoices.length > 0 && (
          <ul className="space-y-3">
            {state.invoices.map((item) => (
              <li key={item.invoice_number}>
                <InvoiceRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Ikon, warna, dan judul baris per jenis nota. */
const ROW_KIND: Record<CustomerInvoiceItem['type'], { icon: LucideIcon; tone: string; title: (item: CustomerInvoiceItem) => string }> = {
  pembelian: { icon: LayoutTemplate, tone: 'bg-brand-50 text-primary', title: (item) => `Pembelian template · ${item.title}` },
  perpanjangan: { icon: CalendarSync, tone: 'bg-success-50 text-success-700', title: (item) => `Perpanjangan ${item.years ?? 1} tahun · ${item.title}` },
  // Judul dari server: "Fitur Berita & Pengumuman"
  fitur: { icon: Sparkles, tone: 'bg-brand-50 text-brand-700', title: (item) => item.title || 'Fitur tambahan' },
};

function InvoiceRow({ item }: { item: CustomerInvoiceItem }) {
  const status = invoiceItemStatus(item);
  const kind = ROW_KIND[item.type] ?? ROW_KIND.pembelian;
  const Icon = kind.icon;
  return (
    // Seluruh kartu bisa diketuk (tautan judul direntangkan); tombol "Lihat nota" tetap di atasnya
    <article className="card-site relative flex flex-col gap-3 p-4 transition-shadow duration-200 hover:ring-line-strong sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kind.tone}`} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-fg">
            <Link to={invoicePath(item)} className="rounded-sm after:absolute after:inset-0 after:rounded-[24px] hover:text-primary">
              {kind.title(item)}
            </Link>
          </h2>
          <p className="mt-0.5 break-all text-xs text-subtle">
            <span className="tabular-nums">{item.invoice_number}</span> · {item.domain}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:shrink-0 sm:justify-end">
        <div>
          <dt className="sr-only">Dibayar pada</dt>
          <dd className="text-[13px] text-muted">{formatTanggal(item.paid_at)}</dd>
        </div>
        <div>
          <dt className="sr-only">Jumlah</dt>
          <dd className="font-semibold tabular-nums text-fg">{formatRupiah(item.amount)}</dd>
        </div>
        <div>
          <dt className="sr-only">Status pembayaran</dt>
          <dd>
            <span
              className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_TONE_CLASS[status.tone]}`}
            >
              {status.label}
            </span>
          </dd>
        </div>
      </dl>
      <span className="relative z-[1] hidden text-[13px] font-medium text-primary sm:inline-flex sm:items-center sm:gap-1" aria-hidden>
        Lihat nota
        <ArrowRight className="h-4 w-4" />
      </span>
    </article>
  );
}
