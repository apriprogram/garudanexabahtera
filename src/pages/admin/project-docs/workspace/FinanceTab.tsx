// Tab Invoice & pembayaran: invoices per payment term (DP, termin, pelunasan) or manual, payment recording with
// proof, cancellation and the receipts (Kuitansi) issued per payment (spec §4.2, §5). Admin only for changes; a
// Developer sees the same figures read-only.
import { useMemo, useState } from 'react';
import { ArrowRight, Ban, Banknote, FilePlus2, Plus, ReceiptText, Wallet } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  MobileCard,
  MobileList,
  Notice,
  Panel,
  PanelHeader,
  StatTile,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  cn,
} from '../../../../components/admin/ui';
import { pdInvoiceCancel } from '../../../../features/project-docs/api';
import { PAYMENT_TRIGGER_LABEL, type InvoiceSummary, type PaymentTerm } from '../../../../features/project-docs/types';
import { InvoiceFormModal } from '../finance/InvoiceFormModal';
import { PaymentFormModal } from '../finance/PaymentFormModal';
import { templateFor } from '../shared/documents';
import { formatPercent, invoiceKindLabel, rupiah, rupiahRingkas, tanggal } from '../shared/format';
import { navToast, type PdNavState } from '../shared/hooks';
import { ReasonModal } from '../shared/ReasonModal';
import { DocStatusBadge, PaymentBadge } from '../shared/ui';
import type { WorkspaceContext } from './context';
import { ExportMenu } from './DocumentsTab';

const live = (i: InvoiceSummary) => i.payment_status !== 'dibatalkan';
const payable = (i: InvoiceSummary) => i.doc_status !== 'draft' && i.payment_status !== 'lunas' && i.payment_status !== 'dibatalkan';

/** Invoice status: draft documents read "Draft", issued ones show the payment status. */
function InvoiceStatus({ invoice, size }: { invoice: InvoiceSummary; size?: 'sm' | 'md' }) {
  if (invoice.doc_status === 'draft' && invoice.payment_status !== 'dibatalkan') return <DocStatusBadge doc={{ status: 'draft', doc_type: 'invoice' }} size={size} />;
  return <PaymentBadge status={invoice.payment_status} overdue={invoice.overdue} size={size} />;
}

export function FinanceTab({ ctx }: { ctx: WorkspaceContext }) {
  const { project, settings, isAdmin, reload, notify } = ctx;
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; term: PaymentTerm | null }>({ open: false, term: null });
  const [paying, setPaying] = useState<InvoiceSummary | null>(null);
  const [cancelling, setCancelling] = useState<InvoiceSummary | null>(null);

  const invoices = project.invoices;
  const receipts = project.documents.filter((d) => d.doc_type === 'receipt');
  const active = invoices.filter(live);
  const billed = active.reduce((s, i) => s + i.amount_due, 0);
  const paid = active.reduce((s, i) => s + i.amount_paid, 0);
  const outstanding = active.filter((i) => i.doc_status !== 'draft').reduce((s, i) => s + i.remaining, 0);
  const termInvoice = (key: string) => invoices.find((i) => i.term_key === key && live(i)) ?? null;
  const openDoc = (documentId: number, options?: { state: PdNavState }) => ctx.go(`/admin/proyek/${project.id}/dokumen/${documentId}`, options);
  // Isi awal invoice baru dan kuitansi yang terbit bersama pembayaran (template engine)
  const invoiceContent = useMemo(() => templateFor('invoice', project, settings), [project, settings]);
  const receiptContent = useMemo(() => templateFor('receipt', project, settings), [project, settings]);

  const invoiceActions = (inv: InvoiceSummary) => (
    <>
      {isAdmin && payable(inv) && (
        <Button size="sm" icon={<Banknote />} onClick={() => setPaying(inv)}>
          Catat bayar
        </Button>
      )}
      {isAdmin && inv.amount_paid === 0 && live(inv) && (
        <IconButton icon={<Ban />} label={`Batalkan ${inv.number}`} size="sm" variant="danger-ghost" onClick={() => setCancelling(inv)} />
      )}
      <IconButton icon={<ArrowRight />} label={`Buka ${inv.number}`} size="sm" onClick={() => openDoc(inv.document_id)} />
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {!isAdmin && (
        <Notice tone="mist">Data keuangan hanya bisa dilihat. Membuat invoice dan mencatat pembayaran khusus administrator.</Notice>
      )}

      <section aria-label="Ringkasan keuangan" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile title="Nilai kontrak" value={rupiahRingkas(project.value)} compact caption={rupiah(project.value)} />
        <StatTile
          title="Sudah ditagih"
          value={rupiahRingkas(billed)}
          compact
          caption={`${rupiah(billed)}${project.value ? ` · ${formatPercent(Math.round((billed / project.value) * 1000) / 10)} dari kontrak` : ''}`}
        />
        <StatTile title="Sudah dibayar" value={rupiahRingkas(paid)} compact caption={rupiah(paid)} />
        <StatTile
          title="Sisa tagihan"
          value={rupiahRingkas(outstanding)}
          compact
          caption={`${rupiah(outstanding)} · ${active.some((i) => i.overdue) ? 'ada yang lewat jatuh tempo' : 'invoice yang sudah terbit'}`}
        />
      </section>

      {/* Termin */}
      <Panel>
        <PanelHeader
          icon={Wallet}
          title="Termin pembayaran"
          subtitle="Buat invoice saat termin jatuh waktunya. Satu termin satu invoice."
          action={
            isAdmin && (
              <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setInvoiceModal({ open: true, term: null })}>
                Invoice manual
              </Button>
            )
          }
        />
        {project.payment_terms.length === 0 ? (
          <Notice tone="warning" action={<Button size="sm" variant="secondary" onClick={() => ctx.openTab('ringkasan')}>Atur termin</Button>}>
            Proyek ini belum punya termin pembayaran. Atur termin di tab Ringkasan.
          </Notice>
        ) : (
          <ul className="divide-y divide-adm-line">
            {project.payment_terms.map((t) => {
              const inv = termInvoice(t.key);
              return (
                <li key={t.key} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-adm-fg">
                      {t.label} <span className="font-normal text-adm-muted">· {formatPercent(t.percent)}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-adm-muted">
                      {rupiah(Math.round((project.value * t.percent) / 100))} · {PAYMENT_TRIGGER_LABEL[t.trigger]} · tempo {t.due_days} hari
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inv ? (
                      <>
                        <span className="font-mono text-xs text-adm-muted">{inv.number}</span>
                        <InvoiceStatus invoice={inv} size="sm" />
                        <Button size="sm" variant="secondary" iconRight={<ArrowRight />} onClick={() => openDoc(inv.document_id)}>
                          Buka
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge tone="mist" size="sm" dot={false}>
                          Belum ditagih
                        </Badge>
                        {isAdmin && (
                          <Button size="sm" icon={<FilePlus2 />} onClick={() => setInvoiceModal({ open: true, term: t })} disabled={!project.value}>
                            Buat invoice
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!project.value && project.payment_terms.length > 0 && (
          <p className="mt-3 text-xs text-adm-warning-fg">Isi nilai kontrak di tab Ringkasan sebelum membuat invoice termin.</p>
        )}
      </Panel>

      {/* Invoice */}
      <Panel padding="none" className="overflow-hidden">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <PanelHeader title="Invoice" subtitle="Draft bisa diubah di editor; terbitkan agar klien bisa melihat dan membayar." />
        </div>
        {invoices.length === 0 ? (
          <EmptyState size="sm" icon={<ReceiptText />} title="Belum ada invoice." description="Buat invoice dari termin di atas." className="border-t border-adm-line" />
        ) : (
          <>
            <MobileList className="border-t border-adm-line md:hidden">
              {invoices.map((inv) => (
                <MobileCard
                  key={inv.id}
                  className={cn(!live(inv) && 'opacity-60')}
                  title={<span className="font-mono">{inv.number}</span>}
                  subtitle={invoiceKindLabel(inv, project.payment_terms)}
                  trailing={<InvoiceStatus invoice={inv} size="sm" />}
                  meta={[
                    { label: 'Tagihan', value: <span className="tabular-nums">{rupiah(inv.amount_due)}</span> },
                    { label: 'Dibayar', value: <span className="tabular-nums">{rupiah(inv.amount_paid)}</span> },
                    { label: 'Tanggal', value: tanggal(inv.issue_date) },
                    { label: 'Jatuh tempo', value: <span className={cn(inv.overdue && 'text-adm-danger-fg')}>{tanggal(inv.due_date)}</span> },
                  ]}
                  actions={
                    <>
                      {invoiceActions(inv)}
                      <ExportMenu docId={inv.document_id} onError={(m) => notify('error', m)} />
                    </>
                  }
                />
              ))}
            </MobileList>
            <TableContainer className="hidden border-t border-adm-line md:block">
              <Table minWidth={960}>
                <THead>
                  <tr>
                    <Th>Nomor</Th>
                    <Th>Jenis</Th>
                    <Th>Tanggal</Th>
                    <Th>Jatuh tempo</Th>
                    <Th align="right">Tagihan</Th>
                    <Th align="right">Dibayar</Th>
                    <Th>Status</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {invoices.map((inv) => (
                    <Tr key={inv.id} className={cn(!live(inv) && 'opacity-60')}>
                      <Td mono className="text-[13px]">
                        {inv.number}
                      </Td>
                      <Td muted className="max-w-[200px] truncate">
                        {invoiceKindLabel(inv, project.payment_terms)}
                      </Td>
                      <Td muted nowrap>
                        {tanggal(inv.issue_date)}
                      </Td>
                      <Td nowrap className={cn(inv.overdue ? 'font-medium text-adm-danger-fg' : 'text-adm-muted')}>
                        {tanggal(inv.due_date)}
                      </Td>
                      <Td align="right" nowrap className="font-semibold tabular-nums">
                        {rupiah(inv.amount_due)}
                      </Td>
                      <Td align="right" nowrap muted className="tabular-nums">
                        {rupiah(inv.amount_paid)}
                      </Td>
                      <Td>
                        <InvoiceStatus invoice={inv} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">{invoiceActions(inv)}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Panel>

      {/* Kuitansi */}
      <Panel padding="none" className="overflow-hidden">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <PanelHeader icon={ReceiptText} title="Kuitansi" subtitle="Terbit otomatis setiap pembayaran dicatat." />
        </div>
        {receipts.length === 0 ? (
          <EmptyState size="sm" title="Belum ada kuitansi." description="Kuitansi muncul setelah pembayaran pertama dicatat." className="border-t border-adm-line" />
        ) : (
          <ul className="divide-y divide-adm-line border-t border-adm-line">
            {receipts.map((r) => {
              const voided = !!r.review_note;
              return (
                <li key={r.id} className={cn('flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5', voided && 'opacity-60')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-adm-fg">{r.title}</p>
                    <p className="mt-0.5 text-xs text-adm-muted">
                      <span className="font-mono">{r.number}</span> · {tanggal(r.doc_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {voided ? (
                      <Badge tone="danger" size="sm">
                        {r.review_note}
                      </Badge>
                    ) : (
                      <Badge tone="mint" size="sm">
                        Terbit
                      </Badge>
                    )}
                    <ExportMenu docId={r.id} onError={(m) => notify('error', m)} />
                    <IconButton icon={<ArrowRight />} label={`Buka ${r.number}`} size="sm" onClick={() => openDoc(r.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {isAdmin && (
        <>
          <InvoiceFormModal
            open={invoiceModal.open}
            onClose={() => setInvoiceModal((s) => ({ ...s, open: false }))}
            mode={{ kind: 'create', term: invoiceModal.term }}
            project={project}
            tax={settings?.tax ?? null}
            content={invoiceContent}
            onSaved={({ documentId, number }) => {
              setInvoiceModal((s) => ({ ...s, open: false }));
              const created = `Invoice ${number ?? ''} berhasil dibuat. Periksa lalu terbitkan.`;
              notify('success', created);
              // Workspace langsung ditinggalkan: toast yang sama tampil di editor invoice
              openDoc(documentId, navToast('success', created));
            }}
            notify={notify}
          />
          <PaymentFormModal
            open={!!paying}
            onClose={() => setPaying(null)}
            invoice={paying}
            receiptContent={receiptContent}
            onSaved={(res) => {
              setPaying(null);
              notify('success', `Pembayaran berhasil dicatat. Kuitansi ${res.receipt_number} terbit.`);
              reload();
            }}
            notify={notify}
          />
          <ReasonModal
            open={!!cancelling}
            onClose={() => setCancelling(null)}
            title={`Batalkan invoice ${cancelling?.number ?? ''}?`}
            description="Invoice yang dibatalkan tetap tersimpan di riwayat dan termin bisa ditagih ulang."
            label="Alasan pembatalan"
            placeholder="mis. Nilai termin berubah setelah adendum."
            confirmText="Ya, batalkan"
            tone="danger"
            icon={<Ban />}
            notify={notify}
            errorTitle="Gagal membatalkan invoice."
            onSubmit={async (reason) => {
              if (!cancelling) return;
              await pdInvoiceCancel({ id: cancelling.id, reason });
              notify('success', `Invoice ${cancelling.number} berhasil dibatalkan.`);
              setCancelling(null);
              reload();
            }}
          />
        </>
      )}
    </div>
  );
}
