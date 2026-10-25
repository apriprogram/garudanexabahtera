// Pemesanan template (/pesan/:slug): ringkasan template + form pemesanan (wajib akun pembeli) →
// customer_create_order → halaman pembayaran Midtrans (payment_url) atau detail pesanan. SPEC §5, §6, §8.
// Harga "Sudah termasuk" & catatan perpanjangan dari useTemplatePricing (keputusan pemilik 2026-10-21); pesanan lunas
// yang ditolak → dana kembali penuh ke metode bayar semula maks. 7 hari kerja (sama dengan /kebijakan-pengembalian-dana).
// Di bawah lg: ringkasan ringkas di atas form, rincian (termasuk, langkah) di dekat tombol bayar; urutan DOM = urutan tampil.
// Domain (keputusan pemilik 2026-10-25, ACCOUNT-DOMAIN-RENEWAL-SPEC.md): tidak termasuk harga template; dipilih & dicek
// ketersediaannya di form (customer_check_domain), harganya ditambahkan ke total di semua ringkasan.
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  LayoutTemplate,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { LogoMark } from '../../components/ui/LogoMark';
import { FIRST_ORDER_DISCOUNT_PERCENT } from '../../lib/firstOrderDiscount';
import { getWhatsappNumber, useSiteSettings, useTemplatePricing, whatsappUrl, type TemplatePricing } from '../../hooks/useSiteSettings';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import { clearSession, customerLoginPath, getCurrentUser, getRole } from '../../lib/auth';
import { useDomainPrices } from '../../lib/useDomainPrices';
import { LEGAL_LABELS, LEGAL_PATHS } from '../../lib/legal';
import { formatRupiah, type DomainCheck, type Order, type Template } from '../../types/platform';
import { Field } from '../account/components/Field';
import { fieldProps } from '../account/components/fieldProps';
import { Notice } from '../account/components/Notice';
import { goToPayment, isPaymentUrl, useDocumentTitle, type OrderCreatedState } from '../account/components/payment';
import { ErrorState, EmptyState, Skeleton } from '../account/components/States';
import { checkEmail, checkText, focusFirstError, hasErrors, normalizePhone, type FieldErrors } from '../account/components/validation';
import { CharCounter } from './custom-order/CharCounter';
import { checkWhatsapp } from './custom-order/validation';
import { WhatsAppIcon } from './custom-order/WhatsAppIcon';
import { DOMAIN_FIELD_ID, DOMAIN_FIELD_LABEL, DomainSearch } from './order/DomainSearch';
import {
  domainTakenError,
  moneyLabel,
  orderAmounts,
  splitDomainInput,
  type OrderAmounts,
  type OrderQuote,
} from './order/orderAmounts';

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; template: Template };

type OrderField =
  | 'customer_name'
  | 'customer_email'
  | 'customer_phone'
  | 'company_name'
  | 'domain_primary'
  | 'notes'
  | 'agree';

const FIELD_ORDER: OrderField[] = ['customer_name', 'customer_email', 'customer_phone', 'company_name', 'domain_primary', 'notes', 'agree'];
/** Field wajib (aria-required); sisanya bertanda "(opsional)". */
const REQUIRED_FIELDS: ReadonlySet<OrderField> = new Set(['customer_name', 'customer_email', 'customer_phone', 'domain_primary', 'agree']);
const NOTES_MAX = 2000;
const AGREE_ERROR = 'Centang persetujuan ini untuk melanjutkan.';
/** Batas pengembalian dana pesanan lunas yang ditolak (keputusan pemilik 2026-10-21). */
const REFUND_WORKING_DAYS = 7;

interface CreateOrderResponse {
  order: Order;
  payment_url: string | null;
  payment_error?: string;
}

export default function OrderTemplate() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Naik saat sesi dihapus (mis. token ditolak server) agar peran dibaca ulang
  const [, setSessionVersion] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const role = getRole();
  const pricing = useTemplatePricing();
  // Akun pembeli: harga yang akan dibayar (diskon pembelian pertama dihitung server); tamu & staf: tanpa quote
  const [fetchedQuote, setFetchedQuote] = useState<{ templateId: number; quote: OrderQuote | null } | null>(null);
  const readyTemplateId = state.status === 'ready' ? state.template.id : null;
  const wantsQuote = readyTemplateId !== null && role === 'customer';
  useEffect(() => {
    if (!wantsQuote || readyTemplateId === null) return undefined;
    let alive = true;
    apiPost<{ quote?: OrderQuote }>('customer_get_order_quote', { template_id: readyTemplateId })
      .then((data) => {
        if (alive) setFetchedQuote({ templateId: readyTemplateId, quote: data.quote ?? null });
      })
      .catch(() => {
        if (alive) setFetchedQuote({ templateId: readyTemplateId, quote: null });
      });
    return () => {
      alive = false;
    };
  }, [wantsQuote, readyTemplateId]);
  const quote = wantsQuote && fetchedQuote?.templateId === readyTemplateId ? fetchedQuote.quote : null;
  // Hasil cek domain terakhir dari form (null = belum dicek / isian berubah); harganya ikut di semua ringkasan
  const [domainCheck, setDomainCheck] = useState<DomainCheck | null>(null);

  useDocumentTitle(state.status === 'ready' ? `Pesan ${state.template.name}` : 'Pesan template');

  useEffect(() => {
    let alive = true;
    apiGet<{ template: Template }>('get_template', { slug })
      .then((data) => {
        if (!alive) return;
        if (!data.template) setState({ status: 'not_found' });
        else setState({ status: 'ready', template: data.template });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: 'not_found' });
        else
          setState({
            status: 'error',
            message:
              err instanceof ApiError && err.code === 'NETWORK'
                ? err.message
                : 'Terjadi kendala saat memuat template. Silakan coba lagi beberapa saat lagi.',
          });
      });
    return () => {
      alive = false;
    };
  }, [slug, attempt]);

  const onSessionLost = () => {
    clearSession();
    setDomainCheck(null);
    setSessionExpired(true);
    setSessionVersion((n) => n + 1);
  };

  const orderPath = `/pesan/${encodeURIComponent(slug)}`;

  // Subjudul mengikuti keadaan: pembeli mengisi form, tamu perlu masuk dulu; staf, error & tidak ditemukan tanpa subjudul
  const subtitle =
    state.status !== 'ready'
      ? null
      : role === 'customer'
        ? 'Lengkapi data pesanan dan domain yang Anda inginkan, lalu lanjutkan ke pembayaran.'
        : role
          ? null
          : 'Masuk atau daftar dulu (1 menit), lalu isi data dan domain Anda.';

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-alt pt-nav">
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
          <Breadcrumb
            items={[
              { label: 'Beranda', to: '/' },
              { label: 'Template', to: '/#templates' },
              ...(state.status === 'ready'
                ? [{ label: state.template.name, to: `/template/${encodeURIComponent(state.template.slug)}` }]
                : []),
              { label: 'Pesan' },
            ]}
          />

          <header className="mt-2 sm:mt-6">
            <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
              {state.status === 'ready' ? `Pesan ${state.template.name}` : 'Pesan template'}
            </h1>
            {subtitle && <p className="mt-2 text-[14px] text-muted sm:text-base">{subtitle}</p>}
          </header>

          <div className="mt-6 sm:mt-8" aria-busy={state.status === 'loading'}>
            {state.status === 'loading' && <OrderSkeleton />}

            {state.status === 'error' && (
              <ErrorState
                title="Template belum bisa dimuat"
                message={state.message}
                onRetry={() => {
                  setState({ status: 'loading' });
                  setAttempt((n) => n + 1);
                }}
              />
            )}

            {state.status === 'not_found' && (
              <EmptyState
                icon={<LayoutTemplate className="h-7 w-7" aria-hidden />}
                title="Template tidak ditemukan"
                description="Template ini mungkin sudah tidak tersedia atau alamatnya salah. Silakan pilih template lain."
                action={
                  <Link to="/#templates" className="btn btn-primary">
                    Pilih Template
                  </Link>
                }
              />
            )}

            {state.status === 'ready' && (
              <>
                {/* HP & tablet: ringkasan satu baris di atas form, agar "Masuk" / field pertama terlihat di layar pertama */}
                <CompactSummary template={state.template} amounts={orderAmounts(state.template, quote, domainCheck)} />
                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
                  <div className="min-w-0">
                    {role === 'customer' ? (
                      <OrderForm
                        template={state.template}
                        pricing={pricing}
                        quote={quote}
                        domainCheck={domainCheck}
                        onDomainCheck={setDomainCheck}
                        onSessionLost={onSessionLost}
                      />
                    ) : role ? (
                      <StaffNotice orderPath={orderPath} onLogout={onSessionLost} />
                    ) : (
                      <>
                        <LoginPrompt orderPath={orderPath} expired={sessionExpired} />
                        <OrderInfoCard pricing={pricing} />
                      </>
                    )}
                  </div>
                  <StickySummary>
                    <OrderSummary
                      template={state.template}
                      pricing={pricing}
                      amounts={orderAmounts(state.template, quote, domainCheck)}
                      guest={!role}
                    />
                  </StickySummary>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer alt />
    </>
  );
}

/* ─────────────────────────── Bagian halaman ─────────────────────────── */

function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-subtle">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {item.to ? (
              // HP: tinggi sentuh 40px (py), teks tetap terpotong rapi bila nama template panjang
              <Link to={item.to} className="truncate transition-colors hover:text-fg max-sm:py-2.5">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-fg">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function OrderSkeleton() {
  return (
    <>
      <div className="card-site mb-5 flex items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:hidden">
        <Skeleton className="aspect-[16/10] w-16 shrink-0 rounded-lg sm:w-32 sm:rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="card-site space-y-5 p-5 sm:p-8">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="card-site hidden space-y-4 p-5 lg:block">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </>
  );
}

/** Pratinjau template (gambar, atau logo di latar brand bila tidak ada / gagal dimuat). */
function TemplateThumb({ template, className }: { template: Template; className: string }) {
  const [imageBroken, setImageBroken] = useState(false);
  return (
    <div className={`relative aspect-[16/10] shrink-0 overflow-hidden bg-alt ring-1 ring-inset ring-line ${className}`}>
      {template.preview_image && !imageBroken ? (
        <img
          src={template.preview_image}
          alt={`Pratinjau template ${template.name}`}
          onError={() => setImageBroken(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
          <LogoMark className="h-8 text-brand-300" />
        </div>
      )}
    </div>
  );
}

/** Tautan "Lihat Demo" (tab baru) + "Detail template"; di HP tinggi sentuhnya 40px. */
function TemplateLinks({ template }: { template: Template }) {
  const slug = encodeURIComponent(template.slug);
  const demoExternal = /^https?:\/\//i.test(template.demo_url || '');
  const demoHref = demoExternal ? (template.demo_url as string) : `/demo/${slug}`;
  const linkClass = 'link-site inline-flex items-center gap-1 max-sm:min-h-10';
  const demoLabel = (
    <>
      Lihat Demo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only"> (tab baru)</span>
    </>
  );
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] sm:gap-x-4">
      {demoExternal ? (
        <a href={demoHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {demoLabel}
        </a>
      ) : (
        <Link to={demoHref} target="_blank" className={linkClass}>
          {demoLabel}
        </Link>
      )}
      <Link to={`/template/${slug}`} className={linkClass}>
        Detail template
      </Link>
    </div>
  );
}

/** Teks domain sebelum dipilih dari hasil cek (sama di semua ringkasan). */
const DOMAIN_PENDING_TEXT = 'belum dipilih';

/** Baris "Domain <nama> (1 tahun)" (nama panjang boleh patah baris). */
const domainLineLabel = (name: string) => (
  <>
    Domain <span className="break-all">{name}</span> (1 tahun)
  </>
);

/**
 * Rincian harga: harga template, diskon pembelian pertama (bila ada), domain tahun pertama, lalu Total = template
 * setelah diskon + domain. Sebelum domain dipilih & dicek: ajakan memilih domain dan subtotal tanpa domain.
 */
function PriceLines({ amounts }: { amounts: OrderAmounts }) {
  return (
    <dl className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-4 text-muted">
        <dt>Harga template</dt>
        <dd className="shrink-0 tabular-nums">{moneyLabel(amounts.listPrice)}</dd>
      </div>
      {amounts.discountAmount > 0 && (
        <div className="flex items-baseline justify-between gap-4 text-success-700">
          <dt>Diskon pembelian pertama ({amounts.discountPercent}%)</dt>
          <dd className="shrink-0 tabular-nums">-{formatRupiah(amounts.discountAmount)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 text-muted">
        {amounts.domain ? (
          <>
            <dt className="min-w-0">{domainLineLabel(amounts.domain.name)}</dt>
            <dd className="shrink-0 tabular-nums">{formatRupiah(amounts.domain.price)}</dd>
          </>
        ) : (
          <>
            <dt>Domain</dt>
            <dd className="text-right text-subtle">{DOMAIN_PENDING_TEXT}</dd>
          </>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-dashed border-line pt-2.5">
        <dt className="font-semibold text-fg">{amounts.domain ? 'Total' : 'Subtotal tanpa domain'}</dt>
        <dd className="text-2xl font-semibold tabular-nums tracking-tight text-fg">{moneyLabel(amounts.total)}</dd>
      </div>
    </dl>
  );
}

/**
 * Ringkasan HP & tablet (< lg): gambar kecil, nama + harga template sebaris, tautan demo, lalu domain + total. Rincian
 * lain ada di dekat tombol bayar.
 */
function CompactSummary({ template, amounts }: { template: Template; amounts: OrderAmounts }) {
  const discounted = amounts.discountAmount > 0;
  return (
    <aside aria-label="Ringkasan pesanan" className="card-site mb-5 p-3 sm:p-4 lg:hidden">
      <div className="flex items-center gap-3 sm:gap-4">
        <TemplateThumb template={template} className="w-16 rounded-lg sm:w-32 sm:rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="truncate text-sm font-semibold text-fg sm:text-base">{template.name}</h2>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-fg sm:text-base">
              <span className="sr-only">Harga template: </span>
              {discounted && <span className="mr-1.5 text-xs font-normal text-subtle line-through">{formatRupiah(amounts.listPrice)}</span>}
              {moneyLabel(amounts.templatePrice)}
            </p>
          </div>
          <div className="sm:mt-1">
            <TemplateLinks template={template} />
          </div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 border-t border-line pt-2.5 text-[13px]">
        <div className="flex items-baseline justify-between gap-3 text-muted">
          {amounts.domain ? (
            <>
              <dt className="min-w-0">{domainLineLabel(amounts.domain.name)}</dt>
              <dd className="shrink-0 tabular-nums">{formatRupiah(amounts.domain.price)}</dd>
            </>
          ) : (
            <>
              <dt>Domain</dt>
              <dd className="text-right text-subtle">{DOMAIN_PENDING_TEXT}</dd>
            </>
          )}
        </div>
        {amounts.domain && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold text-fg">Total</dt>
            <dd className="text-sm font-semibold tabular-nums text-fg sm:text-base">{moneyLabel(amounts.total)}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

/** Daftar "Sudah termasuk" dari setting harga (kosong = tidak ditampilkan). */
function IncludesList({ includes }: { includes: string[] }) {
  if (includes.length === 0) return null;
  return (
    <div>
      <p className="text-[13px] font-medium text-fg">Sudah termasuk</p>
      <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
        {includes.map((item) => (
          <li key={item} className="flex gap-2">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Empat langkah setelah membayar (atau setelah memesan, untuk template gratis). */
function OrderSteps({ free }: { free: boolean }) {
  return (
    <ol className="space-y-2 text-[13px] text-muted">
      {[
        free ? 'Pesanan langsung masuk antrean persetujuan.' : 'Bayar lewat halaman pembayaran Midtrans.',
        'Tim kami memeriksa dan menyetujui pesanan.',
        'Kami mendaftarkan dan menghubungkan domain Anda.',
        'Situs aktif, kontennya bisa Anda ubah sendiri.',
      ].map((text, i) => (
        <li key={text} className="flex gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold tabular-nums text-primary ring-1 ring-inset ring-brand-200">
            {i + 1}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Langkah setelah membayar di HP & tablet: dilipat agar tombol bayar tidak terdorong jauh. */
function StepsDisclosure({ free, className = '' }: { free: boolean; className?: string }) {
  return (
    <details className={`group rounded-2xl bg-surface ring-1 ring-inset ring-line lg:hidden ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium text-fg transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
        {free ? 'Apa yang terjadi setelah memesan?' : 'Apa yang terjadi setelah membayar?'}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-subtle transition-transform duration-200 ease-calm group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="px-4 pb-4">
        <OrderSteps free={free} />
      </div>
    </details>
  );
}

/**
 * Kolom kanan sticky (≥ lg). Bila ringkasan lebih tinggi dari layar (mis. 1366×768), offset atasnya menyesuaikan agar
 * ujung bawahnya (langkah setelah membayar) tetap bisa terlihat, sama seperti panel harga di /template/:slug.
 */
function StickySummary({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setHeight(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ '--order-aside-h': `${height}px` } as CSSProperties}
      className="hidden lg:sticky lg:top-[min(calc(var(--nav-offset)+1.5rem),calc(100svh-var(--order-aside-h)-1.5rem))] lg:block"
    >
      {children}
    </div>
  );
}

/**
 * Ringkasan checkout (≥ lg, kolom kanan sticky): template, yang sudah termasuk, rincian harga + domain, total, dan
 * langkah setelah membayar.
 */
function OrderSummary({
  template,
  pricing,
  amounts,
  guest,
}: {
  template: Template;
  pricing: TemplatePricing;
  amounts: OrderAmounts;
  guest: boolean;
}) {
  const free = amounts.free;

  return (
    <aside aria-label="Ringkasan pesanan" className="card-site overflow-hidden">
      <div className="p-5">
        <TemplateThumb template={template} className="w-full rounded-2xl" />
        <div className="mt-4 min-w-0">
          {template.category && <span className="badge-site">{template.category}</span>}
          <h2 className="mt-2 text-lg font-semibold leading-snug text-fg">{template.name}</h2>
          {template.short_description && <p className="mt-1 line-clamp-2 text-sm text-muted">{template.short_description}</p>}
          <div className="mt-2">
            <TemplateLinks template={template} />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
        <IncludesList includes={pricing.includes} />
        <div className={pricing.includes.length > 0 ? 'border-t border-dashed border-line pt-3' : ''}>
          <PriceLines amounts={amounts} />
        </div>
        {guest && amounts.listPrice > 0 && (
          <p className="rounded-xl bg-success-50 px-3 py-2 text-xs leading-relaxed text-success-700">
            Akun baru: diskon {FIRST_ORDER_DISCOUNT_PERCENT}% otomatis untuk pembelian template pertama Anda.
          </p>
        )}
        {pricing.note && <p className="text-xs leading-relaxed text-muted">{pricing.note}</p>}
      </div>

      <div className="border-t border-line bg-alt/60 px-5 py-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
          {free ? 'Tanpa pembayaran, langsung kami proses.' : 'Pembayaran aman diproses oleh Midtrans.'}
        </p>
        <div className="mt-3">
          <OrderSteps free={free} />
        </div>
      </div>
    </aside>
  );
}

/** Tamu di HP & tablet: apa yang termasuk dan langkah setelah membayar, di bawah ajakan masuk (≥ lg ada di ringkasan). */
function OrderInfoCard({ pricing }: { pricing: TemplatePricing }) {
  return (
    <section aria-label="Rincian harga" className="card-site mt-5 space-y-4 p-5 lg:hidden">
      <IncludesList includes={pricing.includes} />
      {pricing.note && <p className="text-xs leading-relaxed text-muted">{pricing.note}</p>}
      {/* Domain selalu berbayar, jadi setiap pesanan melewati pembayaran (juga template gratis) */}
      <StepsDisclosure free={false} />
    </section>
  );
}

function LoginPrompt({ orderPath, expired }: { orderPath: string; expired: boolean }) {
  return (
    <section className="card-site p-5 sm:p-8" aria-labelledby="login-prompt-title">
      {expired && (
        <Notice tone="warning" className="mb-5">
          Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan pemesanan.
        </Notice>
      )}
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary max-sm:h-10 max-sm:w-10 max-sm:rounded-xl">
        <UserRound className="h-6 w-6 max-sm:h-5 max-sm:w-5" aria-hidden />
      </span>
      <h2 id="login-prompt-title" className="mt-4 text-lg font-semibold text-fg sm:text-xl">
        Masuk untuk melanjutkan pemesanan
      </h2>
      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">
        Pesanan, tagihan, dan konten situs Anda tersimpan di akun pembeli. Belum punya akun? Daftar gratis, hanya perlu
        satu menit.
      </p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Yang perlu Anda siapkan: nama domain pilihan dan nomor WhatsApp aktif.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to={customerLoginPath(orderPath)} className="btn btn-primary">
          Masuk
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link to={`/daftar?next=${encodeURIComponent(orderPath)}`} className="btn btn-outline">
          Daftar Akun
        </Link>
      </div>
      <ul className="mt-6 grid gap-2 border-t border-line pt-5 text-[13px] text-muted sm:grid-cols-2">
        <li className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          Data Anda hanya dipakai untuk pesanan ini.
        </li>
        <li className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          Pembayaran aman lewat Midtrans.
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            Pesanan lunas yang ditolak (mis. domain tidak tersedia): dana kembali penuh.{' '}
            <Link to={LEGAL_PATHS.refund} target="_blank" className="link-site">
              {LEGAL_LABELS.refund}
              <span className="sr-only"> (tab baru)</span>
            </Link>
          </span>
        </li>
      </ul>
    </section>
  );
}

function StaffNotice({ orderPath, onLogout }: { orderPath: string; onLogout: () => void }) {
  const navigate = useNavigate();
  return (
    <Notice
      tone="warning"
      title="Anda sedang masuk sebagai staf"
      action={
        <>
          <Link to="/admin" className="btn btn-outline btn-sm">
            Buka panel admin
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onLogout();
              navigate(customerLoginPath(orderPath));
            }}
          >
            Keluar dan masuk sebagai pembeli
          </button>
        </>
      }
    >
      Pemesanan template hanya bisa dilakukan dengan akun pembeli.
    </Notice>
  );
}

/* ─────────────────────────── Form pemesanan ─────────────────────────── */

function FormSection({ step, title, description, children }: { step: number; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`order-step-${step}`} className="min-w-0 border-t border-line px-5 py-6 first:border-t-0 sm:px-8 sm:py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-semibold tabular-nums text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <h2 id={`order-step-${step}`} className="text-base font-semibold text-fg sm:text-lg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OrderForm({
  template,
  pricing,
  quote,
  domainCheck,
  onDomainCheck,
  onSessionLost,
}: {
  template: Template;
  pricing: TemplatePricing;
  quote: OrderQuote | null;
  /** Hasil cek domain untuk isian sekarang (disimpan induk agar ringkasan ikut menghitung harganya) */
  domainCheck: DomainCheck | null;
  onDomainCheck: (check: DomainCheck | null) => void;
  onSessionLost: () => void;
}) {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [values, setValues] = useState(() => {
    const user = getCurrentUser();
    return {
      customer_name: user?.name ?? '',
      customer_email: user?.email ?? '',
      customer_phone: typeof user?.phone === 'string' ? user.phone : '',
      company_name: '',
      domain_primary: '',
      notes: '',
    };
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<OrderField>>({});
  // Setelah percobaan kirim pertama, setiap field divalidasi langsung saat diketik (pola sama dengan /pesan-custom)
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<{ text: string; pendingLimit?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  // Cek domain: domain yang sedang dicek, galat cek (batas cek / jaringan), dan cek yang dipicu tombol kirim.
  // Nomor urut: hasil yang datang setelah isian berubah (atau setelah cek baru) diabaikan.
  const [checking, setChecking] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkingForSubmit, setCheckingForSubmit] = useState(false);
  const checkSeq = useRef(0);
  // Domain = isian nama (values.domain_primary, tanpa ekstensi) + ekstensi dropdown; hasil cek = nama yang sama di
  // beberapa ekstensi, yang dipilih disimpan induk (domainCheck) agar ringkasan ikut menghitung harganya
  const { domains: tlds } = useDomainPrices();
  const [domainTld, setDomainTld] = useState('com');
  const [checks, setChecks] = useState<DomainCheck[] | null>(null);
  // Galat dari server saat kirim: field baru bisa difokus setelah tidak nonaktif lagi (submitting selesai dan dirender)
  const focusAfterSubmit = useRef<FieldErrors<OrderField> | null>(null);
  useEffect(() => {
    if (submitting || !focusAfterSubmit.current) return;
    focusFirstError(FIELD_ORDER, focusAfterSubmit.current);
    focusAfterSubmit.current = null;
  }, [submitting]);
  const amounts = orderAmounts(template, quote, domainCheck);
  const free = amounts.free;
  const helpHref = whatsappUrl(
    getWhatsappNumber(settings),
    `Halo Garuda Nexa, saya punya pertanyaan tentang pemesanan template ${template.name}.`,
  );

  type FormValues = typeof values;
  type TextField = keyof FormValues;

  /** Aturan satu field (sama dengan server). Pesan disamakan dengan form /pesan-custom. */
  const checkField = (key: OrderField, vals: FormValues, agreed = agree): string | undefined => {
    switch (key) {
      case 'customer_name':
        return checkText(vals.customer_name, 'Nama', { min: 2, max: 150 });
      case 'customer_email':
        return checkEmail(vals.customer_email);
      case 'customer_phone':
        return checkWhatsapp(vals.customer_phone);
      case 'company_name':
        return checkText(vals.company_name, 'Nama perusahaan', { required: false, max: 150 });
      case 'domain_primary':
        return splitDomainInput(vals.domain_primary, domainTld, tlds, DOMAIN_FIELD_LABEL).error;
      case 'notes':
        return checkText(vals.notes, 'Catatan', { required: false, max: NOTES_MAX });
      case 'agree':
        return agreed ? undefined : AGREE_ERROR;
    }
  };

  const recheck = (key: OrderField, vals: FormValues) => setErrors((prev) => ({ ...prev, [key]: checkField(key, vals) }));

  const set = (key: TextField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    // Error tidak dihapus begitu saja: field diperiksa ulang, jadi pesan hilang hanya bila isiannya sudah benar
    if (submitted || errors[key]) recheck(key, next);
  };

  const blur = (key: TextField) => () => {
    // Field kosong yang belum pernah diisi tidak langsung dimarahi; cukup saat kirim
    if (!submitted && !values[key].trim()) return;
    recheck(key, values);
  };

  const focusDomain = () => focusFirstError([DOMAIN_FIELD_ID], { [DOMAIN_FIELD_ID]: 'cek' });

  /** Cek yang sedang berjalan tidak berlaku lagi (isian berubah). */
  const cancelCheck = () => {
    if (checking === null) return;
    checkSeq.current += 1;
    setChecking(null);
  };

  /** Hasil cek & pilihan dibuang: domain harus dicek ulang. */
  const clearChecks = () => {
    setChecks(null);
    onDomainCheck(null);
  };

  const changeDomain = (raw: string) => {
    const next = { ...values, domain_primary: raw };
    setValues(next);
    setCheckError(null);
    cancelCheck();
    // Isian berubah: hasil cek sebelumnya tidak berlaku lagi (kecuali hanya beda huruf besar/spasi)
    if (checks && splitDomainInput(raw, domainTld, tlds).domain !== checks[0]?.domain) clearChecks();
    if (submitted || errors.domain_primary) recheck('domain_primary', next);
  };

  /**
   * Ganti ekstensi di dropdown: bila nama yang sama dengan ekstensi itu ada di hasil cek, langsung terpilih (yang sudah
   * dipakai tidak); selain itu perlu dicek ulang.
   */
  const changeTld = (tld: string) => {
    setDomainTld(tld);
    setCheckError(null);
    cancelCheck();
    const domain = splitDomainInput(values.domain_primary, tld, tlds).domain;
    const row = checks?.find((c) => c.domain === domain);
    if (row) onDomainCheck(row.status === 'taken' ? null : row);
    else clearChecks();
    if (submitted || errors.domain_primary) {
      setErrors((prev) => ({ ...prev, domain_primary: splitDomainInput(values.domain_primary, tld, tlds, DOMAIN_FIELD_LABEL).error }));
    }
  };

  /** Pilih domain dari hasil cek: dropdown ikut ke ekstensinya. */
  const selectDomain = (check: DomainCheck) => {
    if (check.status === 'taken') return;
    setDomainTld(check.tld);
    onDomainCheck(check);
    setErrors((prev) => ({ ...prev, domain_primary: undefined }));
  };

  /** Keluar dari isian: rapikan (huruf kecil, tanpa https://, www., path); ekstensi yang diketik pindah ke dropdown. */
  const blurDomain = () => {
    if (!values.domain_primary.trim()) {
      if (submitted) recheck('domain_primary', values);
      return;
    }
    const split = splitDomainInput(values.domain_primary, domainTld, tlds, DOMAIN_FIELD_LABEL);
    setValues((prev) => ({ ...prev, domain_primary: split.name }));
    if (split.tld !== domainTld) setDomainTld(split.tld);
    if (checks && split.domain !== checks[0]?.domain) clearChecks();
    setErrors((prev) => ({ ...prev, domain_primary: split.error }));
  };

  /**
   * Cek ketersediaan (customer_check_domain, spec §4): nama + ekstensi, server membalas nama yang sama di beberapa
   * ekstensi. Format diperiksa dulu di sini (pesan sama dengan server). Hasil: domain yang diminta (terpilih bila bisa
   * dipakai), atau null bila format salah / gagal / dibatalkan (pesannya sudah ditampilkan).
   */
  const runCheck = async (): Promise<DomainCheck | null> => {
    const split = splitDomainInput(values.domain_primary, domainTld, tlds, DOMAIN_FIELD_LABEL);
    const domain = split.domain;
    const seq = ++checkSeq.current;
    setValues((prev) => ({ ...prev, domain_primary: split.name }));
    setDomainTld(split.tld);
    setCheckError(null);
    clearChecks();
    if (split.error) {
      setChecking(null);
      setErrors((prev) => ({ ...prev, domain_primary: split.error }));
      focusDomain();
      return null;
    }
    setErrors((prev) => ({ ...prev, domain_primary: undefined }));
    setChecking(domain);
    try {
      const data = await apiPost<{ check?: DomainCheck; checks?: DomainCheck[] }>('customer_check_domain', { domain });
      if (seq !== checkSeq.current) return null;
      const list = (Array.isArray(data.checks) && data.checks.length ? data.checks : data.check ? [data.check] : []).filter(
        (c): c is DomainCheck => Boolean(c?.domain && c.status),
      );
      if (!list.length) {
        setCheckError('Ketersediaan domain belum bisa dicek. Silakan coba lagi.');
        return null;
      }
      setChecks(list);
      const requested = list.find((c) => c.domain === domain) ?? list[0];
      if (requested.status !== 'taken') onDomainCheck(requested);
      return requested;
    } catch (err) {
      if (seq !== checkSeq.current) return null;
      if (err instanceof ApiError) {
        if (err.status === 401) {
          onSessionLost();
          return null;
        }
        // 400 VALIDATION {domain}: pesan di bawah field; 429 (batas cek) & lainnya: pesan server di hasil cek
        const fieldError = err.fieldErrors?.domain ?? err.fieldErrors?.domain_primary;
        if (fieldError) {
          setErrors((prev) => ({ ...prev, domain_primary: fieldError }));
          focusDomain();
          return null;
        }
      }
      setCheckError(errorMessage(err, 'Ketersediaan domain belum bisa dicek. Silakan coba lagi.'));
      return null;
    } finally {
      if (seq === checkSeq.current) setChecking(null);
    }
  };

  const validate = (): FieldErrors<OrderField> => {
    const found: FieldErrors<OrderField> = {};
    for (const key of FIELD_ORDER) found[key] = checkField(key, values);
    return found;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || checkingForSubmit) return;
    setFormError(null);
    setSubmitted(true);
    const found = validate();
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
    }

    // Domain wajib dipilih dari hasil cek (tersedia / belum pasti). Belum dicek → cek dulu; yang diminta dipakai bila bisa.
    let check = domainCheck;
    if (!check) {
      const requested = splitDomainInput(values.domain_primary, domainTld, tlds).domain;
      let row = checks?.find((c) => c.domain === requested) ?? null;
      if (!checks) {
        setCheckingForSubmit(true);
        row = await runCheck();
        setCheckingForSubmit(false);
        if (!row) {
          focusDomain();
          return;
        }
      }
      if (!row || row.status === 'taken') {
        const message = row ? domainTakenError(row.domain) : 'Pilih domain dari daftar hasil cek.';
        const notUsable = { domain_primary: `${message} Pilih domain lain yang tersedia di daftar.` };
        setErrors(notUsable);
        focusFirstError(FIELD_ORDER, notUsable);
        return;
      }
      check = row;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<CreateOrderResponse>('customer_create_order', {
        template_id: template.id,
        customer_name: values.customer_name.trim(),
        customer_email: values.customer_email.trim(),
        customer_phone: normalizePhone(values.customer_phone),
        company_name: values.company_name.trim() || null,
        notes: values.notes.trim() || null,
        domain_primary: check.domain,
        // Field lama, masih diterima server sebagai opsional; domain kini dicek sebelum memesan
        domain_alternative: null,
      });
      if (isPaymentUrl(res.payment_url)) {
        setRedirectUrl(res.payment_url);
        goToPayment(res.payment_url);
        return;
      }
      const state: OrderCreatedState = { justCreated: true, paymentError: res.payment_error ?? null };
      navigate(`/akun/pesanan/${encodeURIComponent(res.order.order_number)}`, { state });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          onSessionLost();
          return;
        }
        // 409 DOMAIN_UNAVAILABLE: domain ternyata sudah dipakai saat dipesan → hasil cek direset, pilih/cek nama lain
        if (err.code === 'DOMAIN_UNAVAILABLE') {
          const unavailable = { domain_primary: err.fieldErrors?.domain_primary || domainTakenError(check.domain) };
          clearChecks();
          setErrors(unavailable);
          focusAfterSubmit.current = unavailable;
          return;
        }
        if (err.fieldErrors) {
          const serverErrors: FieldErrors<OrderField> = {};
          for (const key of FIELD_ORDER) {
            if (err.fieldErrors[key]) serverErrors[key] = err.fieldErrors[key];
          }
          if (hasErrors(serverErrors)) {
            if (serverErrors.domain_primary) clearChecks();
            setErrors(serverErrors);
            focusAfterSubmit.current = serverErrors;
            return;
          }
        }
        if (err.code === 'TOO_MANY_PENDING') {
          setFormError({ text: err.message, pendingLimit: true });
          return;
        }
      }
      setFormError({ text: errorMessage(err, 'Gagal membuat pesanan. Silakan coba lagi.') });
    }
  };

  const text = (key: TextField, hasHelp = false) => ({
    ...fieldProps(key, errors[key], hasHelp, REQUIRED_FIELDS.has(key)),
    value: values[key],
    onChange: set(key),
    onBlur: blur(key),
    disabled: submitting,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="card-site overflow-hidden">
      {formError && (
        <div className="px-5 pt-5 sm:px-8 sm:pt-7">
          <Notice
            tone="danger"
            title="Pesanan belum terkirim"
            onClose={() => setFormError(null)}
            action={
              formError.pendingLimit ? (
                <Link to="/akun" className="btn btn-outline btn-sm">
                  Lihat pesanan saya
                </Link>
              ) : undefined
            }
          >
            {formError.text}
          </Notice>
        </div>
      )}

      <FormSection
        step={1}
        title="Data pemesan"
        description="Kami hubungi lewat data ini untuk konfirmasi pesanan. Semua isian wajib, kecuali yang bertanda opsional."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="customer_name" label="Nama lengkap" error={errors.customer_name}>
            <input {...text('customer_name')} type="text" autoComplete="name" placeholder="mis. Budi Santoso" className="input-site" />
          </Field>
          <Field id="customer_email" label="Email" error={errors.customer_email}>
            <input
              {...text('customer_email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="mis. nama@email.com"
              className="input-site"
            />
          </Field>
          <Field id="customer_phone" label="Nomor WhatsApp" error={errors.customer_phone}>
            <input
              {...text('customer_phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="mis. 0812-3456-7890"
              className="input-site"
            />
          </Field>
          <Field id="company_name" label="Nama perusahaan / instansi" optional error={errors.company_name}>
            <input
              {...text('company_name')}
              type="text"
              autoComplete="organization"
              placeholder="mis. PT Maju Bersama"
              maxLength={150}
              className="input-site"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        step={2}
        title="Domain website"
        description="Ketik nama domain, pilih ekstensinya, lalu cek. Pilih domain yang tersedia dari daftar; kami daftarkan untuk Anda setelah pembayaran."
      >
        <DomainSearch
          name={values.domain_primary}
          tld={domainTld}
          tlds={tlds}
          error={errors.domain_primary}
          checks={checks}
          selected={domainCheck}
          checking={checking}
          checkError={checkError}
          disabled={submitting}
          onNameChange={changeDomain}
          onTldChange={changeTld}
          onBlur={blurDomain}
          onCheck={() => void runCheck()}
          onSelect={selectDomain}
        />
      </FormSection>

      <FormSection step={3} title="Catatan" description="Kebutuhan khusus atau info tambahan untuk tim kami.">
        <Field
          id="notes"
          label="Catatan untuk tim kami"
          optional
          error={errors.notes}
          aside={<CharCounter length={values.notes.length} max={NOTES_MAX} />}
        >
          <textarea
            {...text('notes')}
            rows={4}
            placeholder="mis. Tolong gunakan warna hijau sesuai logo kami."
            className="input-site"
          />
        </Field>
      </FormSection>

      <div className="border-t border-line bg-alt/60 px-5 py-6 sm:px-8 sm:py-7">
        {/* HP & tablet: yang sudah termasuk tepat di atas total (≥ lg ada di ringkasan kanan) */}
        {(pricing.includes.length > 0 || pricing.note) && (
          <div className="mb-6 space-y-3 lg:hidden">
            <IncludesList includes={pricing.includes} />
            {pricing.note && <p className="text-xs leading-relaxed text-muted">{pricing.note}</p>}
          </div>
        )}

        <div>
          <label htmlFor="agree" className="flex cursor-pointer items-start gap-3 text-sm text-muted">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                const checked = e.target.checked;
                setAgree(checked);
                if (submitted || errors.agree) setErrors((prev) => ({ ...prev, agree: checkField('agree', values, checked) }));
              }}
              disabled={submitting}
              aria-invalid={errors.agree ? true : undefined}
              aria-required
              aria-describedby={errors.agree ? 'agree-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-primary"
            />
            <span>
              Data di atas sudah benar dan saya menyetujui{' '}
              <Link to={LEGAL_PATHS.terms} target="_blank" className="link-site">
                {LEGAL_LABELS.terms}
                <span className="sr-only"> (tab baru)</span>
              </Link>{' '}
              serta{' '}
              <Link to={LEGAL_PATHS.refund} target="_blank" className="link-site">
                {LEGAL_LABELS.refund}
                <span className="sr-only"> (tab baru)</span>
              </Link>
              .
            </span>
          </label>
          {errors.agree && (
            <p id="agree-error" className="error-site pl-8">
              {errors.agree}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Total = template (setelah diskon) + domain tahun pertama; sebelum domain dicek: subtotal tanpa domain */}
          <div className="min-w-0">
            <p className="text-xs text-subtle">
              {amounts.domain ? 'Total pembayaran' : 'Subtotal tanpa domain'}
              {amounts.discountAmount > 0 ? ` (sudah dipotong diskon ${amounts.discountPercent}%)` : ''}
            </p>
            <p className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">{moneyLabel(amounts.total)}</p>
            <p className="mt-0.5 break-words text-xs text-muted">
              {amounts.domain ? (
                <>
                  Template {moneyLabel(amounts.templatePrice)} + {domainLineLabel(amounts.domain.name)}{' '}
                  {formatRupiah(amounts.domain.price)}
                </>
              ) : (
                `Domain: ${DOMAIN_PENDING_TEXT}`
              )}
            </p>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full shrink-0 sm:w-auto" disabled={submitting || checkingForSubmit}>
            {submitting || checkingForSubmit ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                {checkingForSubmit ? 'Mengecek domain...' : redirectUrl ? 'Membuka pembayaran...' : 'Membuat pesanan...'}
              </>
            ) : (
              <>
                {free ? 'Pesan Sekarang' : 'Lanjut ke Pembayaran'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
        {redirectUrl && (
          <p className="mt-4 text-[13px] text-muted" role="status">
            Pesanan dibuat. Anda sedang diarahkan ke halaman pembayaran Midtrans.{' '}
            <a href={redirectUrl} className="link-site">
              Buka halaman pembayaran
            </a>{' '}
            bila tidak berpindah otomatis.
          </p>
        )}

        {/* Rasa aman & bantuan tepat di bawah tombol bayar */}
        <ul className="mt-5 space-y-2 text-xs leading-relaxed text-muted">
          {!free && (
            <li className="flex gap-2">
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              <span>Pembayaran aman via Midtrans. Pilih metode pembayaran yang tersedia di Midtrans pada langkah berikutnya.</span>
            </li>
          )}
          {!free && (
            <li className="flex gap-2">
              <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
              <span>
                Bila pesanan yang sudah dibayar ditolak (mis. domain tidak tersedia), dana kembali penuh ke metode pembayaran
                semula paling lambat {REFUND_WORKING_DAYS} hari kerja.{' '}
                <Link to={LEGAL_PATHS.refund} target="_blank" className="link-site">
                  {LEGAL_LABELS.refund}
                  <span className="sr-only"> (tab baru)</span>
                </Link>
              </span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-whatsapp" />
            <span>
              Ada pertanyaan?{' '}
              <a
                href={helpHref}
                target="_blank"
                rel="noopener noreferrer"
                className="link-site max-sm:inline-flex max-sm:min-h-10 max-sm:items-center"
              >
                Chat WhatsApp
                <span className="sr-only"> (tab baru)</span>
              </a>
            </span>
          </li>
        </ul>

        <StepsDisclosure free={free} className="mt-5" />
      </div>
    </form>
  );
}
