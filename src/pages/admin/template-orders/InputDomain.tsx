// Input Domain (/admin/pesanan-template/input-domain): domain final untuk order `proses_domain` → order aktif,
// situs dibuat dan CMS terbuka untuk pemesan (admin_set_order_domain). SPEC §4, §6, §9.
import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, ExternalLink, Globe, Inbox, Mail, Phone, RotateCw, X } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconBox,
  IconButton,
  Input,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  SkeletonText,
  cn,
} from '../../../components/admin/ui';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { formatRupiah, formatTanggal, type Order, type Site } from '../../../types/platform';
import { useApiQuery, useToast, type ToastTone } from './shared/hooks';
import { OrderStatusBadge, Toast } from './shared/OrderUi';
import { normalizeDomain, siteHref, validateDomain } from './shared/orderUtils';

type OrdersResponse = { orders: Order[] };
type SetDomainResponse = { order: Order; site: Site };
type Activated = { order: Order; site: Site };

export default function InputDomain() {
  const list = useApiQuery<OrdersResponse>('admin_get_template_orders', { status: 'proses_domain' });
  const [activated, setActivated] = useState<Activated[]>([]);
  const { toast, show, dismiss } = useToast();

  const doneIds = new Set(activated.map((a) => a.order.id));
  const pending = (list.data?.orders ?? []).filter((o) => o.status === 'proses_domain' && !doneIds.has(o.id));

  const handleActivated = (result: Activated) => {
    setActivated((prev) => [result, ...prev.filter((a) => a.order.id !== result.order.id)]);
    show('success', `Template aktif & CMS terbuka untuk ${result.site.domain}.`);
    list.reload();
  };

  return (
    <div className="pb-10">
      <PageHeader
        title="Input Domain"
        description="Isi domain final untuk pesanan yang sudah disetujui. Setelah disimpan, template aktif dan CMS terbuka untuk pemesan."
        meta={
          list.data ? (
            <Badge tone={pending.length ? 'warning' : 'mint'}>{pending.length ? `${pending.length} pesanan menunggu domain` : 'Semua domain sudah diisi'}</Badge>
          ) : undefined
        }
        actions={
          <Button variant="secondary" icon={<RotateCw />} loading={list.loading && !list.initialLoading} onClick={list.reload}>
            Muat ulang
          </Button>
        }
      />

      {list.error && list.data && (
        <Notice tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={list.reload}>Coba lagi</Button>}>
          Gagal memuat pesanan: {list.error}
        </Notice>
      )}

      <div className="space-y-4">
        {activated.map((item) => (
          <ActivatedCard key={item.order.id} item={item} onDismiss={() => setActivated((prev) => prev.filter((a) => a.order.id !== item.order.id))} />
        ))}

        {list.initialLoading ? (
          <div className="grid gap-4 xl:grid-cols-2" aria-busy>
            {[0, 1].map((i) => (
              <Panel key={i} className="space-y-4">
                <Skeleton className="h-5 w-48" rounded="rounded-md" />
                <SkeletonText lines={3} />
                <Skeleton className="h-11 w-full" />
              </Panel>
            ))}
          </div>
        ) : list.error && !list.data ? (
          <Panel>
            <ErrorState title="Gagal memuat pesanan" error={list.error} onRetry={list.reload} />
          </Panel>
        ) : pending.length === 0 ? (
          <EmptyState
            variant="card"
            icon={<Inbox />}
            title="Belum ada pesanan yang menunggu domain."
            description="Pesanan muncul di sini setelah kamu menyetujuinya di Order Masuk."
            action={
              <Button size="sm" variant="secondary" iconRight={<ArrowRight />} to="/admin/pesanan-template?status=menunggu_approval">
                Lihat yang perlu approval
              </Button>
            }
          />
        ) : (
          <div className={cn('grid items-start gap-4 xl:grid-cols-2', list.loading && 'opacity-70')}>
            {pending.map((order) => (
              <DomainCard key={order.id} order={order} onActivated={handleActivated} onStale={list.reload} notify={show} />
            ))}
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DomainCard({
  order,
  onActivated,
  onStale,
  notify,
}: {
  order: Order;
  onActivated: (result: Activated) => void;
  onStale: () => void;
  notify: (tone: ToastTone, message: string) => void;
}) {
  const [domain, setDomain] = useState(order.domain_primary || '');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputId = `domain-${order.id}`;
  const value = normalizeDomain(domain);

  const requested = [
    { label: 'Utama', domain: order.domain_primary },
    ...(order.domain_alternative ? [{ label: 'Alternatif', domain: order.domain_alternative }] : []),
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = validateDomain(domain);
    if (message) {
      setError(message);
      document.getElementById(inputId)?.focus();
      return;
    }
    setDomain(value);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await apiPost<SetDomainResponse>('admin_set_order_domain', { id: order.id, domain: value });
      setConfirmOpen(false);
      onActivated({ order: res.order, site: res.site });
    } catch (err) {
      setConfirmOpen(false);
      if (err instanceof ApiError && err.fieldErrors?.domain) {
        setError(err.fieldErrors.domain);
        document.getElementById(inputId)?.focus();
      } else {
        notify('error', `Gagal menyimpan domain: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
        if (err instanceof ApiError && (err.code === 'INVALID_STATUS' || err.status === 404)) onStale();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel as="article" className="flex flex-col gap-5" aria-labelledby={`order-${order.id}-title`}>
      {/* Kepala kartu */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBox icon={<Globe />} tone="cobalt" />
          <div className="min-w-0">
            <h2 id={`order-${order.id}-title`} className="truncate font-mono text-[14px] font-semibold tabular-nums text-adm-fg sm:text-[15px]">
              {order.order_number}
            </h2>
            <p className="mt-0.5 truncate text-xs text-adm-muted sm:text-[13px]">
              {order.template_name} · <span className="tabular-nums">{formatRupiah(order.price)}</span>
            </p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} label={order.status_label} size="sm" />
      </div>

      {/* Pemesan */}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-2xl bg-adm-ghost px-4 py-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-adm-muted">Pemesan</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-adm-fg">
            {order.customer_name}
            {order.company_name ? <span className="font-normal text-adm-muted"> · {order.company_name}</span> : null}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-adm-muted">Disetujui</dt>
          <dd className="mt-0.5 text-sm font-medium text-adm-fg">{formatTanggal(order.approved_at, true)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-adm-muted">Email</dt>
          <dd className="mt-0.5 truncate text-sm">
            <a href={`mailto:${order.customer_email}`} className="inline-flex max-w-full items-center gap-1.5 text-adm-link hover:underline">
              <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{order.customer_email}</span>
            </a>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-adm-muted">Nomor HP</dt>
          <dd className="mt-0.5 text-sm">
            <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1.5 text-adm-link hover:underline">
              <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              {order.customer_phone}
            </a>
          </dd>
        </div>
        {order.notes && (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-adm-muted">Catatan pemesan</dt>
            <dd className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-[13px] text-adm-fg" title={order.notes}>
              {order.notes}
            </dd>
          </div>
        )}
      </dl>

      {/* Domain diminta */}
      <div>
        <p className="mb-2 text-[13px] font-medium text-adm-fg">Domain diminta pemesan</p>
        <ul className="space-y-2">
          {requested.map((r) => {
            const active = value === r.domain;
            return (
              <li
                key={r.label}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-inset transition-colors',
                  active ? 'bg-adm-cobalt-soft ring-cobalt/30' : 'ring-adm-line',
                )}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">{r.label}</p>
                  <p className="truncate font-mono text-[13px] text-adm-fg">{r.domain}</p>
                </div>
                {active ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-adm-cobalt-fg">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Dipakai
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setDomain(r.domain);
                      setError('');
                    }}
                  >
                    Pakai
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Form domain final */}
      <form onSubmit={handleSubmit} noValidate className="mt-auto space-y-3">
        <Field
          label="Domain final"
          required
          htmlFor={inputId}
          error={error}
          hint="Pastikan domain sudah terdaftar dan DNS-nya mengarah ke server. Huruf kecil, tanpa http://."
        >
          <Input
            id={inputId}
            value={domain}
            mono
            leftIcon={<Globe />}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            maxLength={253}
            invalid={!!error}
            disabled={saving}
            placeholder="mis. namabisnis.com"
            onChange={(e) => {
              setDomain(e.target.value);
              if (error) setError('');
            }}
            onBlur={() => {
              const message = domain.trim() ? validateDomain(domain) : null;
              if (message) setError(message);
            }}
          />
        </Field>
        <Button type="submit" icon={<CheckCircle2 />} loading={saving} fullWidth className="sm:w-auto">
          Simpan & aktifkan
        </Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        loading={saving}
        icon={<Globe />}
        title="Aktifkan template?"
        description={
          <>
            Template <span className="font-semibold text-adm-fg">{order.template_name}</span> milik {order.customer_name} akan aktif di{' '}
            <span className="font-mono font-semibold text-adm-fg">{value}</span> dan CMS terbuka untuk pemesan. Domain tidak bisa diubah dari panel setelah aktif.
          </>
        }
        confirmText="Ya, aktifkan"
      />
    </Panel>
  );
}

/** Kartu sukses setelah domain disimpan: "Template aktif & CMS terbuka". */
function ActivatedCard({ item, onDismiss }: { item: Activated; onDismiss: () => void }) {
  const { order, site } = item;
  return (
    <Panel tone="mint" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex min-w-0 items-start gap-3">
        <IconBox icon={<CheckCircle2 />} tone="mint" className="bg-adm-surface" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-adm-mint-fg sm:text-[15px]">Template aktif & CMS terbuka</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-adm-fg">
            <span className="font-mono font-semibold">{site.domain}</span> · {order.template_name} · {order.customer_name}
          </p>
          <p className="mt-0.5 text-xs text-adm-muted">
            <span className="font-mono tabular-nums">{order.order_number}</span> · aktif {formatTanggal(site.activated_at || order.activated_at, true)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon={<ExternalLink />} href={`/situs/${site.id}`} target="_blank" rel="noopener noreferrer">
          Lihat situs
        </Button>
        <Button size="sm" variant="secondary" icon={<Globe />} href={siteHref(site.domain)} target="_blank" rel="noopener noreferrer">
          Buka domain
        </Button>
        <Button size="sm" variant="ghost" iconRight={<ArrowRight />} to="/admin/pesanan-template/template-aktif">
          Template Aktif
        </Button>
        <IconButton icon={<X />} label="Sembunyikan" size="sm" onClick={onDismiss} />
      </div>
    </Panel>
  );
}
