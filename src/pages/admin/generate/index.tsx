// Menu admin "Generate" (/admin/generate, super admin saja; permintaan pemilik 2026-11-01): tab Invoice dan Proposal.
// Tiap tab punya riwayat (cari, buka, edit, hapus, unduh ulang PDF), form manual atau lewat suara (VoicePanel), dan
// setelah Simpan dokumen berkop PT Garuda Nexa Bahtera langsung tampil (DocumentPreview), bisa dicetak dan diunduh PDF.
// Data: backend/modules/admin_generate.php (gen_*), tabel migrasi 055. Kop & rekening bawaan: pd_settings_get.
// Tampilan diatur lewat query string supaya tombol kembali browser bekerja: ?tab=invoice|proposal&mode=new|edit|view&id=N.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, LoaderCircle, Pencil, Plus, Printer, ReceiptText, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MobileCard,
  MobileList,
  Notice,
  PageHeader,
  Panel,
  SearchInput,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  type Tone,
} from '../../../components/admin/ui';
import { DocumentPreview, exportPdf } from '../../../features/project-docs/engine';
import { pdSettingsGet } from '../../../features/project-docs/api';
import type { CompanySettings } from '../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../lib/api';
import { useDebounced, useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import * as api from './api';
import { bankText, buildInvoiceDoc, buildProposalDoc, companyOf, pdfFileName, statusLabel } from './docModel';
import { InvoiceEditor, ProposalEditor, type FieldErrors } from './editors';
import {
  emptyInvoiceForm,
  emptyProposalForm,
  invoicePayload,
  invoiceToForm,
  proposalPayload,
  proposalToForm,
  rupiah,
  todayJakarta,
  type DocKind,
  type Invoice,
  type InvoiceForm,
  type InvoiceSummary,
  type Proposal,
  type ProposalForm,
  type ProposalSummary,
} from './types';

type Mode = 'list' | 'new' | 'edit' | 'view';
type Doc = { kind: 'invoice'; data: Invoice } | { kind: 'proposal'; data: Proposal };
type Summary = (InvoiceSummary | ProposalSummary) & { title?: string };

const STATUS_TONE: Record<string, Tone> = { draft: 'mist', terkirim: 'cobalt', lunas: 'mint', disetujui: 'mint', ditolak: 'danger' };
const KIND_LABEL: Record<DocKind, string> = { invoice: 'Invoice', proposal: 'Proposal' };

const tanggalPendek = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(m[2]) - 1];
  return `${Number(m[3])} ${bulan} ${m[1]}`;
};

function StatusBadge({ kind, status }: { kind: DocKind; status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'mist'}>{statusLabel(kind, status)}</Badge>;
}

/** Galat server → pesan + galat per kolom (VALIDATION). */
const fieldErrorsOf = (err: unknown): FieldErrors => (err instanceof ApiError && err.fieldErrors ? err.fieldErrors : {});

export default function GeneratePage() {
  const [params, setParams] = useSearchParams();
  const tab: DocKind = params.get('tab') === 'proposal' ? 'proposal' : 'invoice';
  const modeParam = params.get('mode');
  const mode: Mode = modeParam === 'new' || modeParam === 'edit' || modeParam === 'view' ? modeParam : 'list';
  const id = Number(params.get('id')) || 0;
  const { toast, show, dismiss } = useToast();
  const [company, setCompany] = useState<CompanySettings>(() => companyOf(null));
  const today = useMemo(() => todayJakarta(), []);

  // Kop & rekening dari Pengaturan dokumen; gagal → kop bawaan PT Garuda Nexa Bahtera
  useEffect(() => {
    let alive = true;
    pdSettingsGet()
      .then((s) => alive && setCompany(companyOf(s.company)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const go = useCallback(
    (next: { tab?: DocKind; mode?: Mode; id?: number }, replace = false) => {
      const p = new URLSearchParams();
      p.set('tab', next.tab ?? tab);
      if (next.mode && next.mode !== 'list') p.set('mode', next.mode);
      if (next.id) p.set('id', String(next.id));
      setParams(p, { replace });
    },
    [setParams, tab],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate"
        description="Buat invoice dan proposal berkop PT Garuda Nexa Bahtera: isi manual atau dengan suara, simpan, lalu cetak atau unduh PDF."
        actions={
          mode === 'list' ? (
            <Button icon={<Plus />} onClick={() => go({ mode: 'new' })}>
              Buat {KIND_LABEL[tab].toLowerCase()}
            </Button>
          ) : undefined
        }
      />
      <Tabs<DocKind>
        ariaLabel="Jenis dokumen"
        items={[
          { value: 'invoice', label: 'Invoice', icon: <ReceiptText /> },
          { value: 'proposal', label: 'Proposal', icon: <FileText /> },
        ]}
        value={tab}
        onChange={(value) => go({ tab: value })}
      />

      {mode === 'list' && <History key={tab} kind={tab} go={go} company={company} notify={show} />}
      {(mode === 'new' || mode === 'edit') && (
        <EditorView key={`${tab}-${mode}-${id}`} kind={tab} id={mode === 'edit' ? id : 0} today={today} company={company} go={go} notify={show} />
      )}
      {mode === 'view' && <DocView key={`${tab}-${id}`} kind={tab} id={id} company={company} go={go} />}

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}

type Go = (next: { tab?: DocKind; mode?: Mode; id?: number }, replace?: boolean) => void;
type Notify = ReturnType<typeof useToast>['show'];

const loadDoc = async (kind: DocKind, id: number): Promise<Doc> =>
  kind === 'invoice' ? { kind, data: (await api.getInvoice(id)).invoice } : { kind, data: (await api.getProposal(id)).proposal };

const modelOf = (doc: Doc, company: CompanySettings) =>
  doc.kind === 'invoice' ? buildInvoiceDoc(doc.data, company) : buildProposalDoc(doc.data, company);

// ════════════════════════════════════════════════════════════════════════════
// Riwayat
// ════════════════════════════════════════════════════════════════════════════

function History({ kind, go, company, notify }: { kind: DocKind; go: Go; company: CompanySettings; notify: Notify }) {
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 300);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string; rows: Summary[] | null; error: ApiError | Error | null }>({ key: '', rows: null, error: null });
  const [toDelete, setToDelete] = useState<Summary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const requestKey = `${kind}|${q}|${nonce}`;

  useEffect(() => {
    let alive = true;
    const request = kind === 'invoice' ? api.listInvoices(q).then((r) => r.invoices as Summary[]) : api.listProposals(q).then((r) => r.proposals as Summary[]);
    request
      .then((rows) => alive && setState({ key: requestKey, rows, error: null }))
      .catch((err: unknown) => alive && setState((prev) => ({ key: requestKey, rows: prev.rows, error: err instanceof Error ? err : new Error(String(err)) })));
    return () => {
      alive = false;
    };
  }, [kind, q, requestKey]);

  const loading = state.key !== requestKey;
  const rows = state.rows;
  const notMigrated = state.error instanceof ApiError && state.error.code === 'GEN_NOT_MIGRATED';

  const download = async (row: Summary) => {
    setDownloading(row.id);
    try {
      const doc = await loadDoc(kind, row.id);
      await exportPdf(modelOf(doc, company), pdfFileName(kind, doc.data.number));
    } catch (err) {
      notify('error', `Gagal mengunduh PDF: ${errorMessage(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await (kind === 'invoice' ? api.deleteInvoice(toDelete.id) : api.deleteProposal(toDelete.id));
      notify('success', `${KIND_LABEL[kind]} ${toDelete.number} dihapus.`);
      setToDelete(null);
      setNonce((n) => n + 1);
    } catch (err) {
      notify('error', `Gagal menghapus: ${errorMessage(err)}`);
    } finally {
      setDeleting(false);
    }
  };

  if (notMigrated) {
    return (
      <Notice tone="warning" title="Tabel Generate belum ada di database">
        {state.error?.message} Setelah migrasi dijalankan, muat ulang halaman ini.
      </Notice>
    );
  }

  const actions = (row: Summary) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton icon={<Eye />} label={`Lihat ${row.number}`} onClick={() => go({ mode: 'view', id: row.id })} />
      <IconButton icon={<Pencil />} label={`Ubah ${row.number}`} onClick={() => go({ mode: 'edit', id: row.id })} />
      <IconButton
        icon={downloading === row.id ? <LoaderCircle className="animate-spin" /> : <Download />}
        label={`Unduh PDF ${row.number}`}
        disabled={downloading !== null}
        onClick={() => void download(row)}
      />
      <IconButton icon={<Trash2 />} label={`Hapus ${row.number}`} variant="danger-ghost" onClick={() => setToDelete(row)} />
    </div>
  );

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-adm-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-adm-fg">Riwayat {KIND_LABEL[kind].toLowerCase()}</h2>
          <p className="text-[13px] text-adm-muted">{rows ? `${rows.length} dokumen${q ? ' cocok' : ''}` : 'Memuat…'}</p>
        </div>
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder={kind === 'invoice' ? 'Cari nomor, klien, perusahaan…' : 'Cari nomor, klien, judul…'}
          wrapperClassName="sm:w-80"
          aria-label={`Cari ${KIND_LABEL[kind].toLowerCase()}`}
        />
      </div>

      {state.error && !notMigrated && (
        <div className="p-4">
          <ErrorState title="Riwayat belum bisa dimuat" error={state.error} onRetry={() => setNonce((n) => n + 1)} />
        </div>
      )}

      {!state.error && rows && rows.length === 0 && !loading && (
        <EmptyState
          icon={kind === 'invoice' ? <ReceiptText /> : <FileText />}
          title={q ? 'Tidak ada yang cocok' : `Belum ada ${KIND_LABEL[kind].toLowerCase()}`}
          description={q ? 'Coba kata kunci lain.' : `Buat ${KIND_LABEL[kind].toLowerCase()} pertama: isi manual atau dikte dengan suara.`}
          action={
            !q && (
              <Button icon={<Plus />} onClick={() => go({ mode: 'new' })}>
                Buat {KIND_LABEL[kind].toLowerCase()}
              </Button>
            )
          }
          className="py-12"
        />
      )}

      {!state.error && (rows === null || rows.length > 0) && (
        <>
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <THead>
                  <Tr>
                    <Th>Nomor</Th>
                    <Th>Tanggal</Th>
                    <Th>Klien</Th>
                    {kind === 'proposal' && <Th>Judul proyek</Th>}
                    <Th align="right">Total</Th>
                    <Th>Status</Th>
                    <Th align="right">Aksi</Th>
                  </Tr>
                </THead>
                <TBody>
                  {rows === null ? (
                    <TableSkeleton rows={4} cols={kind === 'proposal' ? 7 : 6} />
                  ) : (
                    rows.map((row) => (
                      <Tr key={row.id}>
                        <Td>
                          <button type="button" className="font-mono text-[13px] font-medium text-adm-cobalt-fg hover:underline" onClick={() => go({ mode: 'view', id: row.id })}>
                            {row.number}
                          </button>
                        </Td>
                        <Td className="whitespace-nowrap">{tanggalPendek(row.date)}</Td>
                        <Td>
                          <p className="font-medium text-adm-fg">{row.client_name}</p>
                          {row.client_company && <p className="text-xs text-adm-muted">{row.client_company}</p>}
                        </Td>
                        {kind === 'proposal' && <Td className="max-w-[260px] truncate">{row.title}</Td>}
                        <Td align="right" className="whitespace-nowrap tabular-nums">
                          {rupiah(row.total)}
                        </Td>
                        <Td>
                          <StatusBadge kind={kind} status={row.status} />
                        </Td>
                        <Td align="right">{actions(row)}</Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </TableContainer>
          </div>
          <div className="p-3 md:hidden">
            {rows === null ? (
              <LoadingState />
            ) : (
              <MobileList>
                {rows.map((row) => (
                  <MobileCard
                    key={row.id}
                    title={row.client_name}
                    subtitle={`${row.number} · ${tanggalPendek(row.date)}`}
                    trailing={<StatusBadge kind={kind} status={row.status} />}
                    meta={[{ label: 'Total', value: rupiah(row.total) }]}
                    actions={actions(row)}
                  />
                ))}
              </MobileList>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        tone="danger"
        title={`Hapus ${KIND_LABEL[kind].toLowerCase()} ${toDelete?.number ?? ''}?`}
        description={`${KIND_LABEL[kind]} untuk ${toDelete?.client_name ?? ''} akan dihapus permanen dari riwayat. PDF yang sudah diunduh tidak terpengaruh.`}
        confirmText="Hapus"
        loading={deleting}
      />
    </Panel>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Form (baru / ubah)
// ════════════════════════════════════════════════════════════════════════════

function EditorView({ kind, id, today, company, go, notify }: { kind: DocKind; id: number; today: string; company: CompanySettings; go: Go; notify: Notify }) {
  const [invoice, setInvoice] = useState<InvoiceForm | null>(() => (kind === 'invoice' && !id ? emptyInvoiceForm(today) : null));
  const [proposal, setProposal] = useState<ProposalForm | null>(() => (kind === 'proposal' && !id ? emptyProposalForm(today) : null));
  const [numberHint, setNumberHint] = useState(id ? '' : 'Otomatis');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Form ubah: muat dokumen; form baru: perkiraan nomor berikutnya dari riwayat
  useEffect(() => {
    let alive = true;
    if (id) {
      loadDoc(kind, id)
        .then((doc) => {
          if (!alive) return;
          setNumberHint(doc.data.number);
          if (doc.kind === 'invoice') setInvoice(invoiceToForm(doc.data));
          else setProposal(proposalToForm(doc.data));
        })
        .catch((err: unknown) => alive && setLoadError(errorMessage(err)));
    } else {
      // Hanya next_number yang dipakai: kata kunci yang tidak cocok dengan dokumen mana pun menjaga responsnya kecil
      (kind === 'invoice' ? api.listInvoices('__nomor_berikutnya__') : api.listProposals('__nomor_berikutnya__'))
        .then((r) => alive && setNumberHint(`${r.next_number} (otomatis)`))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [kind, id]);

  const onVoice = (source: string, note: string) => notify(source === 'ai' ? 'success' : 'info', 'Form terisi dari suara', `${note} Periksa sebelum menyimpan.`);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (kind === 'invoice' && invoice) {
        const { invoice: saved } = await api.saveInvoice(invoicePayload(invoice));
        notify('success', `Invoice ${saved.number} tersimpan.`);
        go({ mode: 'view', id: saved.id }, true);
      } else if (kind === 'proposal' && proposal) {
        const { proposal: saved } = await api.saveProposal(proposalPayload(proposal));
        notify('success', `Proposal ${saved.number} tersimpan.`);
        go({ mode: 'view', id: saved.id }, true);
      }
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      notify('error', 'Belum tersimpan', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const back = () => (id ? go({ mode: 'view', id }) : go({ mode: 'list' }));
  const header = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={back} className="-ml-2">
      {id ? `Kembali ke ${KIND_LABEL[kind].toLowerCase()}` : 'Kembali ke riwayat'}
    </Button>
  );

  if (loadError) {
    return (
      <div className="space-y-4">
        {header}
        <ErrorState title={`${KIND_LABEL[kind]} belum bisa dimuat`} error={loadError} />
      </div>
    );
  }

  const common = { errors, numberHint, today, saving, onSave: () => void save(), onCancel: back, onVoice };
  return (
    <div className="space-y-4">
      {header}
      <h2 className="text-lg font-semibold text-adm-fg">{id ? `Ubah ${KIND_LABEL[kind].toLowerCase()} ${numberHint}` : `${KIND_LABEL[kind]} baru`}</h2>
      {kind === 'invoice' ? (
        invoice ? (
          <InvoiceEditor form={invoice} update={(fn) => setInvoice((f) => (f ? fn(f) : f))} paymentPlaceholder={bankText(company)} {...common} />
        ) : (
          <LoadingState />
        )
      ) : proposal ? (
        <ProposalEditor form={proposal} update={(fn) => setProposal((f) => (f ? fn(f) : f))} {...common} />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Dokumen jadi: pratinjau A4, cetak, unduh PDF
// ════════════════════════════════════════════════════════════════════════════

function DocView({ kind, id, company, go }: { kind: DocKind; id: number; company: CompanySettings; go: Go }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadDoc(kind, id)
      .then((d) => alive && setDoc(d))
      .catch((err: unknown) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [kind, id]);

  const model = useMemo(() => (doc ? modelOf(doc, company) : null), [doc, company]);

  const download = async () => {
    if (!doc || !model) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportPdf(model, pdfFileName(kind, doc.data.number));
    } catch (err) {
      setExportError(`Gagal mengunduh PDF: ${errorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const back = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => go({ mode: 'list' })} className="-ml-2">
      Kembali ke riwayat
    </Button>
  );
  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState title={`${KIND_LABEL[kind]} belum bisa dimuat`} error={error} />
      </div>
    );
  }
  if (!doc || !model) return <LoadingState />;

  const subtitle = doc.kind === 'invoice' ? doc.data.client_name : `${doc.data.title} · ${doc.data.client_name}`;
  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[13px] text-adm-muted">{doc.data.number}</p>
          <h2 className="mt-1 text-xl font-semibold text-adm-fg">
            {KIND_LABEL[kind]} · {rupiah(doc.data.total)}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge kind={kind} status={doc.data.status} />
            <span className="truncate text-xs text-adm-subtle">{subtitle}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Aksi ${KIND_LABEL[kind].toLowerCase()}`}>
          <Button variant="secondary" icon={<Pencil />} onClick={() => go({ mode: 'edit', id })}>
            Edit
          </Button>
          <Button variant="secondary" icon={<Printer />} onClick={() => window.print()}>
            Cetak
          </Button>
          <Button icon={<Download />} loading={exporting} onClick={() => void download()}>
            {exporting ? 'Menyiapkan PDF…' : 'Unduh PDF'}
          </Button>
        </div>
      </div>
      {exportError && (
        <Notice tone="danger" onClose={() => setExportError(null)}>
          {exportError}
        </Notice>
      )}
      <section aria-label={`Pratinjau ${KIND_LABEL[kind].toLowerCase()}`} className="min-w-0 rounded-[24px] bg-adm-ghost p-2.5 ring-1 ring-inset ring-adm-line sm:p-4">
        <DocumentPreview model={model} />
      </section>
    </div>
  );
}
