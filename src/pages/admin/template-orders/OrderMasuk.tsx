// Order Masuk (/admin/pesanan-template): daftar pesanan template + detail, Approve & Tolak. SPEC §4, §6, §9.
// Detail juga memuat rincian domain berbayar, masa aktif, dan riwayat perpanjangan (ACCOUNT-DOMAIN-RENEWAL-SPEC.md §3–§5),
// serta fitur tambahan situs: status, riwayat tagihan, Aktifkan gratis / Nonaktifkan (SITE-ADDONS-SPEC.md §7).
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ExternalLink, Eye, Inbox, Mail, Phone, RotateCw, ShoppingBag, X, XCircle } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconBox,
  IconButton,
  LoadingState,
  MobileCard,
  MobileList,
  Modal,
  ModalBody,
  ModalFooter,
  Notice,
  PageHeader,
  Panel,
  SearchInput,
  Spinner,
  Table,
  TableContainer,
  TableSkeleton,
  Tabs,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  TONE_CLASS,
  cn,
} from '../../../components/admin/ui';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { formatRupiah, formatTanggal, type Order, type OrderStatus, type Renewal, type Site } from '../../../types/platform';
import type { SiteAddonOrder, SiteAddonState } from '../../../types/siteAddons';
import { useApiQuery, useDebounced, useToast, type ToastTone } from './shared/hooks';
import { SiteAddonsSection } from './shared/SiteAddonsSection';
import {
  ActivePeriodRows,
  DetailList,
  DomainCheckNote,
  DrawerSection,
  OrderStatusBadge,
  PaymentStatusBadge,
  PriceBreakdown,
  RenewalHistory,
  Toast,
} from './shared/OrderUi';
import {
  ORDER_STATUSES,
  ORDER_STATUS_SHORT,
  capableAddons,
  domainPeriod,
  hasActivePeriod,
  isOrderStatus,
  logEventLabel,
  logTone,
  orderExpiryNotice,
  orderLabel,
  orderPriceLines,
  paymentTypeLabel,
  servicePeriod,
  type StaffOrderLog,
} from './shared/orderUtils';

type OrdersResponse = { orders: Order[]; counts: Partial<Record<OrderStatus | 'all', number>> };
/**
 * `renewals` (terbaru dulu) tidak ada di backend sebelum migrasi 026; `addons` (keadaan fitur situs pesanan ini, kosong
 * tanpa situs) dan `addon_orders` (terbaru dulu) tidak ada sebelum fitur tambahan (SITE-ADDONS-SPEC.md §4.2).
 */
type OrderDetailResponse = {
  order: Order;
  logs: StaffOrderLog[];
  site: Site | null;
  renewals?: Renewal[];
  addons?: SiteAddonState[];
  addon_orders?: SiteAddonOrder[];
};
type StatusFilter = OrderStatus | 'all';

const REJECTABLE: OrderStatus[] = ['menunggu_pembayaran', 'menunggu_approval'];

export default function OrderMasuk() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const status: StatusFilter = isOrderStatus(statusParam) ? statusParam : 'all';
  const openId = Number(searchParams.get('order')) || null;

  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const list = useApiQuery<OrdersResponse>('admin_get_template_orders', { status: status === 'all' ? undefined : status, q: q || undefined });
  const { toast, show, dismiss } = useToast();

  // Isi drawer tetap tampil selama animasi tutup
  const [shownId, setShownId] = useState<number | null>(openId);
  if (openId != null && openId !== shownId) setShownId(openId);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const orders = list.data?.orders ?? [];
  const counts = list.data?.counts ?? {};
  const filtered = status !== 'all' || q !== '';
  const needApproval = counts.menunggu_approval ?? 0;

  const tabs = [
    { value: 'all' as StatusFilter, label: 'Semua', count: list.data ? counts.all ?? 0 : undefined },
    ...ORDER_STATUSES.map((s) => ({ value: s as StatusFilter, label: ORDER_STATUS_SHORT[s], count: list.data ? counts[s] ?? 0 : undefined })),
  ];

  const openOrder = (id: number) => setParam('order', String(id));

  return (
    <div className="pb-10">
      <PageHeader
        title="Order Masuk"
        description="Pantau pesanan template, cek status pembayaran, lalu setujui atau tolak pesanan."
        actions={
          <Button variant="secondary" icon={<RotateCw />} loading={list.loading && !list.initialLoading} onClick={list.reload}>
            Muat ulang
          </Button>
        }
      />

      {needApproval > 0 && status !== 'menunggu_approval' && (
        <Notice
          tone="cobalt"
          className="mb-4"
          title={`${needApproval} pesanan sudah dibayar dan menunggu approval`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setParam('status', 'menunggu_approval')}>
              Tampilkan
            </Button>
          }
        >
          Periksa data pemesan dan domain yang diminta, lalu setujui pesanannya.
        </Notice>
      )}

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={<Tabs items={tabs} value={status} onChange={(v) => setParam('status', v === 'all' ? null : v)} size="sm" ariaLabel="Filter status pesanan" />}
          right={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Cari no. order, pemesan, domain..."
              controlSize="sm"
              wrapperClassName="w-full lg:w-72"
              aria-label="Cari pesanan"
            />
          }
        />

        {list.error && list.data && (
          <div className="px-4 pt-4 sm:px-5">
            <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={list.reload}>Coba lagi</Button>}>
              Gagal memuat pesanan: {list.error}
            </Notice>
          </div>
        )}

        {list.initialLoading ? (
          <>
            <LoadingState label="Memuat pesanan..." className="md:hidden" />
            <TableContainer className="hidden md:block">
              <Table>
                <TBody>
                  <TableSkeleton rows={6} cols={7} />
                </TBody>
              </Table>
            </TableContainer>
          </>
        ) : list.error && !list.data ? (
          <ErrorState title="Gagal memuat pesanan" error={list.error} onRetry={list.reload} />
        ) : orders.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<Inbox />}
              title="Pesanan tidak ditemukan."
              description="Coba ubah kata kunci atau pilih status lain."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setParam('status', null);
                  }}
                >
                  Hapus filter
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<ShoppingBag />}
              title="Belum ada pesanan template."
              description="Pesanan akan muncul di sini setelah pembeli memesan template dari website."
            />
          )
        ) : (
          <div className={cn('transition-opacity', list.loading && 'opacity-60')} aria-busy={list.loading || undefined}>
            {/* HP: kartu */}
            <MobileList className="md:hidden">
              {orders.map((o) => (
                <MobileCard
                  key={o.id}
                  title={<span className="font-mono tabular-nums">{o.order_number}</span>}
                  subtitle={`${o.customer_name} · ${o.template_name}`}
                  trailing={<OrderStatusBadge status={o.status} label={o.status_label} size="sm" />}
                  meta={[
                    { label: 'Harga', value: <span className="tabular-nums">{formatRupiah(o.price)}</span> },
                    { label: 'Pembayaran', value: <PaymentStatusBadge status={o.payment_status} size="sm" /> },
                    { label: 'Domain', value: o.domain || o.domain_primary },
                    { label: 'Tanggal', value: formatTanggal(o.created_at, true) },
                  ]}
                  actions={
                    <Button size="sm" variant="secondary" icon={<Eye />} onClick={() => openOrder(o.id)}>
                      Lihat detail
                    </Button>
                  }
                />
              ))}
            </MobileList>

            {/* Desktop: tabel */}
            <TableContainer className="hidden md:block">
              <Table minWidth={980}>
                <THead>
                  <tr>
                    <Th>No. order</Th>
                    <Th>Pemesan</Th>
                    <Th>Template</Th>
                    <Th align="right">Harga</Th>
                    <Th>Status</Th>
                    <Th>Pembayaran</Th>
                    <Th>Tanggal</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {orders.map((o) => (
                    <Tr key={o.id} onClick={() => openOrder(o.id)} selected={o.id === openId}>
                      <Td nowrap className="font-mono text-[13px] font-semibold tabular-nums">
                        {o.order_number}
                      </Td>
                      <Td>
                        <p className="max-w-[220px] truncate font-medium text-adm-fg">{o.customer_name}</p>
                        <p className="max-w-[220px] truncate text-xs text-adm-muted">{o.customer_email}</p>
                      </Td>
                      <Td>
                        <p className="max-w-[200px] truncate text-adm-fg">{o.template_name}</p>
                        <p className="max-w-[200px] truncate text-xs text-adm-muted">{o.domain || o.domain_primary}</p>
                      </Td>
                      <Td align="right" nowrap className="font-semibold tabular-nums">
                        {formatRupiah(o.price)}
                      </Td>
                      <Td>
                        <OrderStatusBadge status={o.status} label={o.status_label} />
                      </Td>
                      <Td>
                        <PaymentStatusBadge status={o.payment_status} />
                      </Td>
                      <Td muted nowrap className="text-[13px]">
                        {formatTanggal(o.created_at, true)}
                      </Td>
                      <Td align="right">
                        <IconButton
                          icon={<Eye />}
                          label={`Lihat detail ${o.order_number}`}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrder(o.id);
                          }}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </Panel>

      <Drawer open={openId != null} onClose={() => setParam('order', null)} width="sm:max-w-xl md:max-w-2xl" customBody>
        {shownId != null && (
          <OrderDetail
            key={shownId}
            id={shownId}
            fallback={orders.find((o) => o.id === shownId)}
            onClose={() => setParam('order', null)}
            onChanged={list.reload}
            notify={show}
          />
        )}
      </Drawer>

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail pesanan (isi drawer)                                          */
/* ------------------------------------------------------------------ */

function OrderDetail({
  id,
  fallback,
  onClose,
  onChanged,
  notify,
}: {
  id: number;
  fallback?: Order;
  onClose: () => void;
  onChanged: () => void;
  notify: (tone: ToastTone, message: string) => void;
}) {
  const detail = useApiQuery<OrderDetailResponse>('admin_get_template_order', { id });
  const loaded = detail.data && detail.data.order.id === id ? detail.data : null;
  const order = loaded?.order ?? fallback ?? null;
  const logs = loaded?.logs ?? [];
  const site = loaded?.site ?? null;
  const renewals = loaded?.renewals ?? [];
  // Fitur tambahan: hanya fitur yang didukung template situsnya; backend tanpa `addons` = bagian disembunyikan
  const addons = capableAddons(loaded?.addons);
  const addonOrders = loaded?.addon_orders ?? [];
  // Acuan sisa masa aktif (hitungannya per hari, cukup sekali per buka detail)
  const [now] = useState(() => new Date());

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [approveError, setApproveError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const afterChange = () => {
    detail.reload();
    onChanged();
  };

  /** Keadaan fitur dari respons admin_set_site_addon langsung tampil; riwayat tagihan & log dimuat ulang. */
  const handleAddonsUpdated = (next: SiteAddonState[]) => {
    detail.mutate((d) => ({ ...d, addons: (d.addons ?? []).map((a) => next.find((n) => n.code === a.code) ?? a) }));
    detail.reload();
  };

  /** Status order sudah berubah di tempat lain (409 INVALID_STATUS): tutup dialog dan muat ulang. */
  const handleActionError = (err: unknown, verb: string) => {
    notify('error', `Gagal ${verb}: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    if (err instanceof ApiError && (err.code === 'INVALID_STATUS' || err.status === 404)) {
      setApproveOpen(false);
      setRejectOpen(false);
      afterChange();
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    const note = approveNote.trim();
    if (note.length > 500) {
      setApproveError('Catatan maksimal 500 karakter.');
      return;
    }
    setBusy('approve');
    try {
      await apiPost('admin_approve_template_order', { id: order.id, ...(note ? { note } : {}) });
      setApproveOpen(false);
      setApproveNote('');
      notify('success', `Pesanan ${order.order_number} berhasil disetujui. Lanjutkan isi domain di Input Domain.`);
      afterChange();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.note) setApproveError(err.fieldErrors.note);
      handleActionError(err, 'menyetujui pesanan');
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!order) return;
    const value = reason.trim();
    if (value.length < 3) {
      setReasonError(value ? 'Alasan penolakan minimal 3 karakter.' : 'Alasan penolakan wajib diisi.');
      return;
    }
    if (value.length > 500) {
      setReasonError('Alasan penolakan maksimal 500 karakter.');
      return;
    }
    setBusy('reject');
    try {
      await apiPost('admin_reject_template_order', { id: order.id, reason: value });
      setRejectOpen(false);
      setReason('');
      notify('success', `Pesanan ${order.order_number} berhasil ditolak.`);
      afterChange();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.reason) setReasonError(err.fieldErrors.reason);
      handleActionError(err, 'menolak pesanan');
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-adm-line px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <IconBox icon={<ShoppingBag />} tone="cobalt" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-adm-fg sm:text-lg">Detail pesanan</h2>
          <p className="mt-0.5 truncate font-mono text-[13px] tabular-nums text-adm-muted sm:text-sm">{order?.order_number ?? `#${id}`}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {detail.loading && order && <Spinner size="sm" className="text-adm-subtle" label="Memuat detail" />}
        <IconButton icon={<X />} label="Tutup" variant="soft" size="sm" onClick={onClose} />
      </div>
    </div>
  );

  if (!order) {
    return (
      <>
        {header}
        <ModalBody>
          {detail.error ? (
            <ErrorState title="Gagal memuat detail pesanan" error={detail.error} onRetry={detail.reload} />
          ) : (
            <LoadingState label="Memuat detail pesanan..." className="py-20" />
          )}
        </ModalBody>
      </>
    );
  }

  const canApprove = order.status === 'menunggu_approval';
  const canReject = REJECTABLE.includes(order.status);
  const showPeriod = hasActivePeriod(order);
  const expiryNotice = orderExpiryNotice(order, now);
  const addonSiteId = site?.id ?? order.site_id ?? null;

  return (
    <>
      {header}
      <ModalBody className="custom-scrollbar space-y-6 sm:space-y-7">
        {/* Ringkasan */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} label={order.status_label} />
            <PaymentStatusBadge status={order.payment_status} />
          </div>
          <p className="mt-3 text-xl font-semibold tracking-tight text-adm-fg sm:text-2xl">{order.template_name}</p>
          <p className="mt-1 text-sm text-adm-muted">
            <span className="font-semibold tabular-nums text-adm-fg">{formatRupiah(order.price)}</span> · Dipesan {formatTanggal(order.created_at, true)}
          </p>
        </div>

        {order.status === 'menunggu_approval' && (
          <Notice tone="cobalt" title="Pembayaran sudah diterima">
            Periksa data pemesan dan domain yang diminta. Setelah disetujui, isi domain final di halaman Input Domain.
          </Notice>
        )}
        {order.status === 'menunggu_pembayaran' && (
          <Notice tone="warning" title="Menunggu pembayaran">
            Pemesan belum menyelesaikan pembayaran. Status berubah otomatis setelah Midtrans mengonfirmasi pembayaran.
          </Notice>
        )}
        {order.status === 'proses_domain' && (
          <Notice
            tone="cobalt"
            title="Pesanan sudah disetujui"
            action={
              <Button size="sm" variant="secondary" iconRight={<ArrowRight />} to="/admin/pesanan-template/input-domain">
                Isi domain
              </Button>
            }
          >
            Isi domain final agar template aktif dan CMS terbuka untuk pemesan.
          </Notice>
        )}
        {order.status === 'ditolak' && (
          <Notice tone="danger" title="Pesanan ditolak">
            {order.rejected_reason || 'Tanpa alasan.'}
          </Notice>
        )}
        {order.status === 'aktif' && (
          <Notice
            tone="mint"
            title="Template aktif & CMS terbuka"
            action={
              site || order.site_id ? (
                <Button size="sm" variant="secondary" icon={<ExternalLink />} href={`/situs/${site?.id ?? order.site_id}`} target="_blank" rel="noopener noreferrer">
                  Lihat situs
                </Button>
              ) : undefined
            }
          >
            Domain: <span className="font-semibold">{order.domain || '-'}</span>
            {site && site.status === 'suspended' && ' (situs sedang dinonaktifkan)'}
          </Notice>
        )}
        {expiryNotice && (
          <Notice tone={expiryNotice.tone} title={expiryNotice.title}>
            {expiryNotice.text}
          </Notice>
        )}

        <DrawerSection title="Data pemesan">
          <DetailList
            items={[
              { label: 'Nama', value: order.customer_name },
              { label: 'Perusahaan', value: order.company_name || '-' },
              {
                label: 'Email',
                value: (
                  <a href={`mailto:${order.customer_email}`} className="inline-flex items-center gap-1.5 break-all text-adm-link hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                    {order.customer_email}
                  </a>
                ),
              },
              {
                label: 'Nomor HP',
                value: (
                  <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1.5 text-adm-link hover:underline">
                    <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                    {order.customer_phone}
                  </a>
                ),
              },
              {
                label: 'Akun pembeli',
                value: order.user ? `${order.user.name || '-'} (${order.user.email || '-'})` : '-',
                full: true,
              },
            ]}
          />
        </DrawerSection>

        <DrawerSection title="Domain diminta">
          <DetailList
            items={[
              { label: 'Domain utama', value: <span className="font-mono text-[13px]">{order.domain_primary}</span> },
              { label: 'Domain alternatif', value: order.domain_alternative ? <span className="font-mono text-[13px]">{order.domain_alternative}</span> : '-' },
              ...(order.domain_check
                ? [{ label: 'Ketersediaan domain utama', value: <DomainCheckNote check={order.domain_check} />, full: true }]
                : []),
              { label: 'Domain final', value: order.domain ? <span className="font-mono text-[13px]">{order.domain}</span> : 'Belum diisi', full: true },
            ]}
          />
        </DrawerSection>

        <DrawerSection title="Catatan pemesan">
          {order.notes ? (
            <p className="whitespace-pre-line break-words rounded-xl bg-adm-ghost px-4 py-3 text-sm leading-relaxed text-adm-fg">{order.notes}</p>
          ) : (
            <p className="text-sm text-adm-muted">Tidak ada catatan.</p>
          )}
        </DrawerSection>

        <DrawerSection title="Pembayaran">
          <PriceBreakdown lines={orderPriceLines(order)} className="mb-4" />
          <DetailList
            items={[
              { label: 'Status pembayaran', value: <PaymentStatusBadge status={order.payment_status} size="sm" /> },
              { label: 'Metode', value: paymentTypeLabel(order.payment_type) },
              ...(order.invoice_number
                ? [{ label: 'No. nota', value: <span className="font-mono text-[13px] tabular-nums">{order.invoice_number}</span> }]
                : []),
              { label: 'Dibayar pada', value: formatTanggal(order.paid_at, true) },
              { label: 'Disetujui pada', value: formatTanggal(order.approved_at, true) },
              { label: 'Aktif pada', value: formatTanggal(order.activated_at, true) },
              ...(order.cancelled_at ? [{ label: 'Dibatalkan pada', value: formatTanggal(order.cancelled_at, true) }] : []),
            ]}
          />
        </DrawerSection>

        {showPeriod && (
          <DrawerSection title="Masa aktif">
            <ActivePeriodRows
              now={now}
              rows={[
                { label: 'Hosting & jasa', period: servicePeriod(order) },
                {
                  label: (
                    <>
                      Domain <span className="break-all font-mono">{order.domain || order.domain_primary}</span>
                    </>
                  ),
                  period: domainPeriod(order),
                },
              ]}
            />
          </DrawerSection>
        )}

        {(order.status === 'aktif' || renewals.length > 0) && (
          <DrawerSection title="Perpanjangan">
            {loaded ? (
              <RenewalHistory renewals={renewals} />
            ) : detail.error ? (
              <p className="text-sm text-adm-muted">Gagal memuat perpanjangan.</p>
            ) : (
              <LoadingState label="Memuat perpanjangan..." className="py-8" />
            )}
          </DrawerSection>
        )}

        {addons.length > 0 && addonSiteId != null && (
          <DrawerSection title="Fitur tambahan">
            <SiteAddonsSection
              siteId={addonSiteId}
              domain={site?.domain ?? order.domain ?? order.domain_primary}
              addons={addons}
              orders={addonOrders}
              onUpdated={handleAddonsUpdated}
              notify={notify}
            />
          </DrawerSection>
        )}

        <DrawerSection title="Riwayat">
          {!loaded ? (
            detail.error ? (
              <ErrorState size="sm" title="Gagal memuat riwayat" error={detail.error} onRetry={detail.reload} />
            ) : (
              <LoadingState label="Memuat riwayat..." className="py-8" />
            )
          ) : logs.length === 0 ? (
            <p className="text-sm text-adm-muted">Belum ada riwayat.</p>
          ) : (
            <OrderTimeline logs={logs} />
          )}
        </DrawerSection>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
        {canReject && (
          <Button
            variant="danger-soft"
            icon={<XCircle />}
            onClick={() => {
              setReasonError('');
              setRejectOpen(true);
            }}
          >
            Tolak
          </Button>
        )}
        {canApprove && (
          <Button
            icon={<Check />}
            onClick={() => {
              setApproveError('');
              setApproveOpen(true);
            }}
          >
            Setujui
          </Button>
        )}
      </ModalFooter>

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        loading={busy === 'approve'}
        icon={<Check />}
        title="Setujui pesanan?"
        description={
          <>
            Pesanan <span className="font-semibold text-adm-fg">{order.order_number}</span> akan masuk tahap proses domain. Setelah itu isi domain final
            di halaman Input Domain.
          </>
        }
        confirmText="Ya, setujui"
      >
        <Field label="Catatan" optional htmlFor="approve-note" error={approveError} hint="Tersimpan di riwayat pesanan.">
          <Textarea
            id="approve-note"
            rows={3}
            maxLength={500}
            value={approveNote}
            invalid={!!approveError}
            onChange={(e) => {
              setApproveNote(e.target.value);
              if (approveError) setApproveError('');
            }}
            placeholder="mis. Domain utama tersedia, lanjut pendaftaran."
          />
        </Field>
      </ConfirmDialog>

      <Modal
        open={rejectOpen}
        onClose={() => (busy === 'reject' ? undefined : setRejectOpen(false))}
        closeOnOverlay={busy !== 'reject'}
        title="Tolak pesanan?"
        description={<span className="font-mono tabular-nums">{order.order_number}</span>}
        icon={<XCircle />}
        size="sm"
        zIndex={110}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={busy === 'reject'}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleReject} loading={busy === 'reject'}>
              Ya, tolak
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleReject();
          }}
        >
          {order.status === 'menunggu_approval' ? (
            <Notice tone="warning">Pemesan sudah membayar. Pastikan kamu memproses pengembalian dana secara manual bila perlu.</Notice>
          ) : (
            <Notice tone="mist">Pesanan belum dibayar. Tagihan pembayaran yang masih berjalan ikut dibatalkan.</Notice>
          )}
          <Field label="Alasan penolakan" required htmlFor="reject-reason" error={reasonError} hint="Alasan ini terlihat oleh pemesan di halaman akunnya.">
            <Textarea
              id="reject-reason"
              rows={4}
              maxLength={500}
              value={reason}
              invalid={!!reasonError}
              aria-describedby={reasonError ? undefined : 'reject-reason-count'}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              placeholder="mis. Domain yang diminta tidak tersedia dan pemesan belum bisa dihubungi."
            />
          </Field>
          <p id="reject-reason-count" className="-mt-2 text-right text-xs tabular-nums text-adm-subtle">
            {reason.trim().length}/500
          </p>
        </form>
      </Modal>
    </>
  );
}

/** Timeline log order (terlama di atas). */
function OrderTimeline({ logs }: { logs: StaffOrderLog[] }) {
  return (
    <ol className="space-y-0">
      {logs.map((log, i) => {
        const tone = logTone(log.event);
        const last = i === logs.length - 1;
        const payload = log.payload && typeof log.payload === 'object' ? log.payload : null;
        return (
          <li key={log.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[5px] top-4 h-[calc(100%-8px)] w-px bg-adm-line" aria-hidden />}
            <span className={cn('relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-adm-surface', TONE_CLASS[tone].dot)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-adm-fg">{logEventLabel(log.event)}</p>
              {log.to_status && log.from_status !== log.to_status && (
                <p className="mt-0.5 text-xs text-adm-muted">
                  {log.from_status ? `${orderLabel(log.from_status)} → ` : ''}
                  <span className="font-medium text-adm-fg">{orderLabel(log.to_status)}</span>
                </p>
              )}
              {log.note && <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-relaxed text-adm-fg">{log.note}</p>}
              <p className="mt-1 text-xs text-adm-subtle">
                {log.actor_name || 'Sistem'} · {formatTanggal(log.created_at, true)}
              </p>
              {payload && (
                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded-md text-xs font-medium text-adm-link hover:underline">
                    Lihat data pembayaran
                  </summary>
                  <pre className="custom-scrollbar mt-2 max-h-56 overflow-auto rounded-xl bg-adm-ghost p-3 font-mono text-[11px] leading-relaxed text-adm-muted">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
