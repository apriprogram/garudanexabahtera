// Pemesanan template (/pesan/:slug): ringkasan template + form pemesanan (wajib akun pembeli) →
// customer_create_order → halaman pembayaran Midtrans (payment_url) atau detail pesanan. SPEC §5, §6, §8.
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  LayoutTemplate,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { LogoMark } from '../../components/ui/LogoMark';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import { clearSession, customerLoginPath, getCurrentUser, getRole } from '../../lib/auth';
import { formatRupiah, type Order, type Template } from '../../types/platform';
import { Field } from '../account/components/Field';
import { fieldProps } from '../account/components/fieldProps';
import { Notice } from '../account/components/Notice';
import { goToPayment, isPaymentUrl, useDocumentTitle, type OrderCreatedState } from '../account/components/payment';
import { ErrorState, EmptyState, Skeleton } from '../account/components/States';
import {
  checkDomain,
  checkEmail,
  checkPhone,
  checkText,
  focusFirstError,
  hasErrors,
  normalizeDomain,
  normalizePhone,
  type FieldErrors,
} from '../account/components/validation';

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
  | 'domain_alternative'
  | 'notes'
  | 'agree';

const FIELD_ORDER: OrderField[] = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'company_name',
  'domain_primary',
  'domain_alternative',
  'notes',
  'agree',
];
const NOTES_MAX = 2000;

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
    setSessionExpired(true);
    setSessionVersion((n) => n + 1);
  };

  const orderPath = `/pesan/${encodeURIComponent(slug)}`;

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-alt pt-16 lg:pt-[72px]">
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

          <header className="mt-4 sm:mt-6">
            <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">Pesan template</h1>
            <p className="mt-2 text-[14px] text-muted sm:text-base">
              Lengkapi data pesanan dan domain yang Anda inginkan, lalu lanjutkan ke pembayaran.
            </p>
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
                    Lihat Template
                  </Link>
                }
              />
            )}

            {state.status === 'ready' && (
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
                <div className="min-w-0">
                  {role === 'customer' ? (
                    <OrderForm template={state.template} onSessionLost={onSessionLost} />
                  ) : role ? (
                    <StaffNotice orderPath={orderPath} onLogout={onSessionLost} />
                  ) : (
                    <LoginPrompt orderPath={orderPath} expired={sessionExpired} />
                  )}
                </div>
                <div className="order-first lg:order-none lg:sticky lg:top-24">
                  <OrderSummary template={state.template} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
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
              <Link to={item.to} className="truncate transition-colors hover:text-fg">
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
      <div className="card-site order-first space-y-4 p-5 lg:order-none">
        <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

/** Ringkasan checkout: template, harga, total, dan apa yang terjadi setelah membayar. */
function OrderSummary({ template }: { template: Template }) {
  const [imageBroken, setImageBroken] = useState(false);
  const slug = encodeURIComponent(template.slug);
  const demoExternal = /^https?:\/\//i.test(template.demo_url || '');
  const demoHref = demoExternal ? (template.demo_url as string) : `/demo/${slug}`;
  const free = Number(template.price) <= 0;

  return (
    <aside aria-label="Ringkasan pesanan" className="card-site overflow-hidden">
      <div className="flex gap-4 p-4 sm:p-5 lg:block">
        <div className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-xl bg-alt ring-1 ring-inset ring-line sm:w-36 lg:w-full lg:rounded-2xl">
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
        <div className="min-w-0 lg:mt-4">
          {template.category && <span className="badge-site">{template.category}</span>}
          <h2 className="mt-2 text-base font-semibold leading-snug text-fg sm:text-lg">{template.name}</h2>
          {template.short_description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted max-sm:hidden">{template.short_description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {demoExternal ? (
              <a href={demoHref} target="_blank" rel="noopener noreferrer" className="link-site inline-flex items-center gap-1">
                Lihat Demo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <Link to={demoHref} target="_blank" className="link-site inline-flex items-center gap-1">
                Lihat Demo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
            <Link to={`/template/${slug}`} className="link-site">
              Detail template
            </Link>
          </div>
        </div>
      </div>

      <dl className="space-y-2.5 border-t border-line px-4 py-4 text-sm sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Harga template</dt>
          <dd className="font-medium tabular-nums text-fg">{free ? 'Gratis' : formatRupiah(template.price)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-line pt-3">
          <dt className="font-semibold text-fg">Total</dt>
          <dd className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">
            {formatRupiah(template.price)}
          </dd>
        </div>
      </dl>

      <div className="border-t border-line bg-alt/60 px-4 py-4 sm:px-5">
        <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
          {free ? 'Tanpa pembayaran, langsung kami proses.' : 'Pembayaran aman diproses oleh Midtrans.'}
        </p>
        <ol className="mt-3 space-y-2 text-[13px] text-muted">
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
      </div>
    </aside>
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
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
        <UserRound className="h-6 w-6" aria-hidden />
      </span>
      <h2 id="login-prompt-title" className="mt-4 text-lg font-semibold text-fg sm:text-xl">
        Masuk untuk melanjutkan pemesanan
      </h2>
      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">
        Pesanan, tagihan, dan konten situs Anda tersimpan di akun pembeli. Belum punya akun? Daftar gratis, hanya perlu
        satu menit.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to={customerLoginPath(orderPath)} className="btn btn-primary">
          Masuk
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link to={`/daftar?next=${encodeURIComponent(orderPath)}`} className="btn btn-outline">
          Daftar akun baru
        </Link>
      </div>
      <ul className="mt-6 grid gap-2 border-t border-line pt-5 text-[13px] text-muted sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Data Anda hanya dipakai untuk pesanan ini.
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Pembayaran aman lewat Midtrans.
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

function FormSection({ step, title, description, children }: { step: number; title: string; description?: string; children: ReactNode }) {
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

function OrderForm({ template, onSessionLost }: { template: Template; onSessionLost: () => void }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => {
    const user = getCurrentUser();
    return {
      customer_name: user?.name ?? '',
      customer_email: user?.email ?? '',
      customer_phone: typeof user?.phone === 'string' ? user.phone : '',
      company_name: '',
      domain_primary: '',
      domain_alternative: '',
      notes: '',
    };
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<OrderField>>({});
  const [formError, setFormError] = useState<{ text: string; pendingLimit?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const free = Number(template.price) <= 0;

  type TextField = keyof typeof values;

  const set = (key: TextField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const tidyDomain = (key: 'domain_primary' | 'domain_alternative') => () => {
    setValues((prev) => ({ ...prev, [key]: normalizeDomain(prev[key]) }));
  };

  const validate = (): FieldErrors<OrderField> => {
    const primary = normalizeDomain(values.domain_primary);
    const alternative = normalizeDomain(values.domain_alternative);
    return {
      customer_name: checkText(values.customer_name, 'Nama pemesan', { min: 2, max: 150 }),
      customer_email: checkEmail(values.customer_email),
      customer_phone: checkPhone(values.customer_phone, 'Nomor HP/WhatsApp'),
      company_name: checkText(values.company_name, 'Nama perusahaan', { required: false, max: 150 }),
      domain_primary: checkDomain(values.domain_primary, 'Domain utama', true),
      domain_alternative:
        checkDomain(values.domain_alternative, 'Domain alternatif', false) ??
        (alternative && alternative === primary ? 'Domain alternatif harus berbeda dari domain utama.' : undefined),
      notes: checkText(values.notes, 'Catatan', { required: false, max: NOTES_MAX }),
      agree: agree ? undefined : 'Centang persetujuan ini untuk melanjutkan.',
    };
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
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
        domain_primary: normalizeDomain(values.domain_primary),
        domain_alternative: normalizeDomain(values.domain_alternative) || null,
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
        if (err.fieldErrors) {
          const serverErrors: FieldErrors<OrderField> = {};
          for (const key of FIELD_ORDER) {
            if (err.fieldErrors[key]) serverErrors[key] = err.fieldErrors[key];
          }
          if (hasErrors(serverErrors)) {
            setErrors(serverErrors);
            focusFirstError(FIELD_ORDER, serverErrors);
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
    ...fieldProps(key, errors[key], hasHelp),
    value: values[key],
    onChange: set(key),
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

      <FormSection step={1} title="Data pemesan" description="Kami hubungi lewat data ini untuk konfirmasi pesanan.">
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
              placeholder="nama@email.com"
              className="input-site"
            />
          </Field>
          <Field id="customer_phone" label="Nomor HP/WhatsApp" error={errors.customer_phone}>
            <input
              {...text('customer_phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="mis. 081234567890"
              className="input-site"
            />
          </Field>
          <Field id="company_name" label="Nama perusahaan/bisnis" optional error={errors.company_name}>
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
        description="Alamat website yang Anda inginkan. Kami cek ketersediaannya setelah pembayaran."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="domain_primary"
            label="Domain utama"
            error={errors.domain_primary}
            help="Contoh: namabisnis.com atau namabisnis.co.id"
          >
            <input
              {...text('domain_primary', true)}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="namabisnis.com"
              onBlur={tidyDomain('domain_primary')}
              className="input-site"
            />
          </Field>
          <Field
            id="domain_alternative"
            label="Domain alternatif"
            optional
            error={errors.domain_alternative}
            help="Dipakai bila domain utama sudah dimiliki orang lain."
          >
            <input
              {...text('domain_alternative', true)}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="namabisnis.id"
              onBlur={tidyDomain('domain_alternative')}
              className="input-site"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection step={3} title="Catatan" description="Kebutuhan khusus atau info tambahan untuk tim kami.">
        <Field
          id="notes"
          label="Catatan untuk tim kami"
          optional
          error={errors.notes}
          aside={
            <span className={`text-xs tabular-nums ${values.notes.length > NOTES_MAX ? 'text-danger' : 'text-subtle'}`}>
              {values.notes.length}/{NOTES_MAX}
            </span>
          }
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
        <div>
          <label htmlFor="agree" className="flex cursor-pointer items-start gap-3 text-sm text-muted">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                if (errors.agree) setErrors((prev) => ({ ...prev, agree: undefined }));
              }}
              disabled={submitting}
              aria-invalid={errors.agree ? true : undefined}
              aria-describedby={errors.agree ? 'agree-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-primary"
            />
            <span>
              Data di atas sudah benar. Saya memahami bahwa situs aktif setelah pembayaran diterima, pesanan disetujui, dan
              domain selesai diproses.
            </span>
          </label>
          {errors.agree && (
            <p id="agree-error" className="error-site pl-8">
              {errors.agree}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-subtle">Total pembayaran</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">
              {formatRupiah(template.price)}
            </p>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                {redirectUrl ? 'Membuka pembayaran...' : 'Membuat pesanan...'}
              </>
            ) : (
              <>
                {free ? 'Pesan sekarang' : 'Lanjut ke pembayaran'}
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
      </div>
    </form>
  );
}
