// Editor dokumen (/admin/proyek/:id/dokumen/:docId): sections editor with markup help and table editor, live A4
// preview (engine DocumentPreview), toolbar per status and role (simpan draft · Ctrl+S, ajukan / terbitkan, tarik
// kembali, tandatangani, ajukan perubahan, tandai selesai, ekspor PDF/DOCX), revisions drawer with restore,
// approvals & signatures, invoice payments, merge-field warnings and an unsaved-changes guard
// (docs/platform/PROJECT-DOCS-SPEC.md §1, §6, §7).
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FilePen,
  FileSearch,
  FileText,
  History,
  Lock,
  MoreHorizontal,
  PenLine,
  Receipt,
  Save,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  InfoRow,
  Input,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  Spinner,
  cn,
  type DropdownItem,
} from '../../../components/admin/ui';
import {
  pdDocumentChange,
  pdDocumentComplete,
  pdDocumentDelete,
  pdDocumentGet,
  pdDocumentRestore,
  pdDocumentSave,
  pdDocumentSubmit,
  pdDocumentWithdraw,
  pdInvoiceCancel,
  pdSettingsGet,
} from '../../../features/project-docs/api';
import { DOC_TYPES, DocumentPreview, SECTION_HINTS, buildModel, defaultContent, hari, tanggalPanjang } from '../../../features/project-docs/engine';
import type { DocContent, DocDetail, DocSection, DocumentGetResponse, MergeData, SettingsGetResponse } from '../../../features/project-docs/types';
import { errorMessage } from '../../../lib/api';
import { useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import { ApprovalsPanel } from './editor/ApprovalsPanel';
import { MarkupHelp } from './editor/MarkupHelp';
import { groupMissing } from './editor/missing';
import { PaymentsPanel } from './editor/PaymentsPanel';
import { editorPermissions } from './editor/permissions';
import { RevisionsDrawer } from './editor/RevisionsDrawer';
import { SectionsEditor } from './editor/SectionsEditor';
import { SignModal } from './editor/SignModal';
import { useSignatureSources } from './editor/useSignatureSources';
import { InvoiceFormModal } from './finance/InvoiceFormModal';
import { PaymentFormModal } from './finance/PaymentFormModal';
import { exportModel, signatureRefs, withSignatureImages, type ExportFormat } from './shared/documents';
import { docShort, tanggal, waktu } from './shared/format';
import { navToast, useNavToast, useUnsavedGuard, usePdQuery, useViewer } from './shared/hooks';
import { ReasonModal } from './shared/ReasonModal';
import { DocStatusBadge, PaymentBadge } from './shared/ui';
import { isDate } from './shared/validation';

/** Editable part of a document. */
interface Draft {
  title: string;
  doc_date: string;
  content: DocContent;
}

type Busy = 'save' | 'submit' | 'withdraw' | 'complete' | 'delete' | 'export' | null;
type Confirm = 'submit' | 'withdraw' | 'complete' | 'delete' | null;

const MAX_CONTENT = 256 * 1024;

const toDraft = (doc: DocDetail): Draft => ({ title: doc.title, doc_date: doc.doc_date, content: doc.content });

/** Live merge data with the draft's title and date (drafts render live data; locked documents their snapshot). */
function previewMerge(merge: MergeData, draft: Draft): MergeData {
  if (!isDate(draft.doc_date)) return merge;
  return { ...merge, document: { ...merge.document, title: draft.title, date: draft.doc_date, date_long: tanggalPanjang(draft.doc_date), day: hari(draft.doc_date) } };
}

export default function DocumentEditor() {
  const { id, docId } = useParams();
  const documentId = Number(docId);
  const valid = Number.isInteger(documentId) && documentId > 0;
  const navigate = useNavigate();
  const viewer = useViewer();
  const { toast, show, dismiss } = useToast();

  const query = usePdQuery<DocumentGetResponse>(valid ? `doc:${documentId}` : null, () => pdDocumentGet({ id: documentId }));
  const settingsQuery = usePdQuery<SettingsGetResponse>('pd_settings', pdSettingsGet);
  const doc = query.data?.document ?? null;

  // Draft mengikuti dokumen dari server setiap kali versi/status berubah (setelah simpan, ajukan, tanda tangan, ...)
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const docKey = doc ? `${doc.id}:${doc.version}:${doc.status}:${doc.updated_at ?? ''}:${doc.signed_parties.join(',')}` : null;
  if (doc && docKey !== syncedKey) {
    const next = toDraft(doc);
    setSyncedKey(docKey);
    setDraft(next);
    setSavedJson(JSON.stringify(next));
  }

  const [changeNote, setChangeNote] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const perms = doc ? editorPermissions(doc, viewer) : null;
  const editable = !!perms?.editable;
  const dirty = editable && !!draft && JSON.stringify(draft) !== savedJson;
  const guard = useUnsavedGuard(dirty, navigate);
  // Toast dari workspace yang baru ditinggalkan (mis. dokumen atau invoice baru dibuat), tampil setelah editor siap
  useNavToast(show, !!doc && !!draft && !!perms);

  // Pratinjau langsung (ditunda sedikit saat mengetik agar input tetap ringan)
  const deferred = useDeferredValue(draft);
  const model = useMemo(() => {
    if (!doc || !deferred) return null;
    const merge = doc.status === 'draft' ? previewMerge(doc.merge, deferred) : doc.merge;
    return buildModel(doc.doc_type, deferred.content, merge);
  }, [doc, deferred]);
  const images = useSignatureSources(useMemo(() => [...(model ? signatureRefs(model) : []), ...(doc?.signatures.map((s) => s.image_url) ?? [])], [model, doc]));
  const previewModel = useMemo(() => (model ? withSignatureImages(model, images) : null), [model, images]);

  // Kursor terakhir di isi bagian: tujuan token dari bantuan format
  const lastBody = useRef<{ sectionId: string; el: HTMLTextAreaElement } | null>(null);

  const projectId = doc?.project_id ?? Number(id);
  const workspacePath = `/admin/proyek/${projectId}${doc && (doc.doc_type === 'invoice' || doc.doc_type === 'receipt') ? '?tab=invoice' : '?tab=dokumen'}`;

  const updateDraft = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setSections = (sections: DocSection[]) => setDraft((d) => (d ? { ...d, content: { ...d.content, sections } } : d));

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<unknown>, success: string, after: () => void = query.reload) => {
    setBusy(kind);
    try {
      await action();
      show('success', success);
      after();
      return true;
    } catch (err) {
      show('error', `Gagal: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      return false;
    } finally {
      setBusy(null);
    }
  };

  /** Saves the draft as a new version; false when validation or the request failed. */
  const save = async (): Promise<boolean> => {
    if (!doc || !draft || !editable) return false;
    const title = draft.title.trim();
    if (!title) {
      setTitleError('Judul dokumen wajib diisi.');
      show('error', 'Judul dokumen wajib diisi.');
      return false;
    }
    if (!isDate(draft.doc_date)) {
      show('error', 'Tanggal dokumen tidak valid.');
      return false;
    }
    if (JSON.stringify(draft.content).length > MAX_CONTENT) {
      show('error', 'Isi dokumen terlalu besar (maks. 256 KB). Pindahkan sebagian isi ke lampiran.');
      return false;
    }
    setTitleError(null);
    setBusy('save');
    try {
      const res = await pdDocumentSave({ id: doc.id, content: draft.content, title, doc_date: draft.doc_date, change_note: changeNote.trim() || undefined });
      setChangeNote('');
      // Langsung dianggap tersimpan agar penjaga perubahan tidak muncul sebelum data baru dimuat
      setSavedJson(JSON.stringify({ ...draft, title }));
      show('success', `Draft berhasil disimpan (versi ${res.version}).`);
      query.reload();
      return true;
    } catch (err) {
      show('error', `Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      return false;
    } finally {
      setBusy(null);
    }
  };

  // Ctrl+S / Cmd+S menyimpan draft
  const saveRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    saveRef.current = () => {
      if (dirty && busy === null) void save();
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const insertToken = (token: string) => {
    const target = lastBody.current;
    if (!editable || !target || !target.el.isConnected) {
      void navigator.clipboard?.writeText(token).catch(() => undefined);
      show('info', `${token} tersalin. Klik isi bagian lalu tempel.`);
      return;
    }
    const { el, sectionId } = target;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    // Blok otomatis harus berdiri di barisnya sendiri
    const insert = token.startsWith('{{#') ? `${before && !before.endsWith('\n') ? '\n' : ''}${token}${after.startsWith('\n') ? '' : '\n'}` : token;
    setDraft((d) =>
      d ? { ...d, content: { ...d.content, sections: d.content.sections.map((s) => (s.id === sectionId ? { ...s, body: before + insert + after } : s)) } } : d,
    );
    const caret = (before + insert).length;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const doExport = async (format: ExportFormat) => {
    if (!model) return;
    setBusy('export');
    try {
      await exportModel(model, format);
      if (dirty) show('info', 'Ekspor memakai isi yang sedang diedit (belum disimpan).');
    } catch (err) {
      show('error', `Gagal mengekspor: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(null);
    }
  };

  const confirmAction = async () => {
    if (!doc) return;
    const kind = confirm;
    if (kind === 'submit') {
      if (dirty && !(await save())) return setConfirm(null);
      await run('submit', () => pdDocumentSubmit({ id: doc.id }), doc.doc_type === 'invoice' ? 'Invoice berhasil diterbitkan.' : 'Dokumen berhasil diajukan ke klien.');
    } else if (kind === 'withdraw') {
      await run('withdraw', () => pdDocumentWithdraw({ id: doc.id }), 'Pengajuan berhasil ditarik. Dokumen kembali menjadi draft.');
    } else if (kind === 'complete') {
      await run('complete', () => pdDocumentComplete({ id: doc.id }), 'Dokumen berhasil ditandai selesai.');
    } else if (kind === 'delete') {
      const deleted = 'Draft dokumen berhasil dihapus.';
      // Editor langsung ditutup, jadi toast suksesnya dibawa ke workspace
      await run('delete', () => pdDocumentDelete({ id: doc.id }), deleted, () => navigate(workspacePath, navToast('success', deleted)));
    }
    setConfirm(null);
  };

  // ── Status halaman ──
  if (!valid || query.notFound) {
    return (
      <div className="pb-10">
        <PageHeader back={{ to: `/admin/proyek/${id ?? ''}`, label: 'Workspace proyek' }} title="Editor dokumen" />
        <Panel>
          <EmptyState
            icon={<FileSearch />}
            title="Dokumen tidak ditemukan."
            description="Dokumen ini mungkin sudah dihapus."
            action={
              <Button size="sm" variant="secondary" to={`/admin/proyek/${id ?? ''}?tab=dokumen`}>
                Kembali ke workspace
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }
  if (!doc || !draft || !perms) {
    return (
      <div className="pb-10">
        <PageHeader back={{ to: `/admin/proyek/${id ?? ''}`, label: 'Workspace proyek' }} title="Editor dokumen" />
        <Panel>{query.error ? <ErrorState title="Gagal memuat dokumen" error={query.error} onRetry={query.reload} /> : <LoadingState label="Memuat dokumen..." />}</Panel>
      </div>
    );
  }

  const info = DOC_TYPES[doc.doc_type];
  const isInvoice = doc.doc_type === 'invoice';
  const cancelled = isInvoice && doc.invoice?.payment_status === 'dibatalkan';
  const missing = doc.status === 'draft' && model ? groupMissing(model.missing, projectId) : [];
  const missingCount = missing.reduce((n, g) => n + g.fields.length, 0);
  const settings = settingsQuery.data;
  const label = `${info.short} ${doc.number}`;
  const showEditor = editable && !previewOnly;

  const moreItems: DropdownItem[] = [
    { label: 'Riwayat revisi', icon: <History />, onClick: () => setRevisionsOpen(true) },
    ...(perms.canEditInvoice ? [{ label: 'Ubah rincian invoice', icon: <Receipt />, onClick: () => setInvoiceOpen(true) }] : []),
    ...(perms.canChange ? [{ label: 'Ajukan perubahan', icon: <FilePen />, onClick: () => setChangeOpen(true) }] : []),
    ...(perms.canCancelInvoice ? [{ label: 'Batalkan invoice', icon: <Ban />, danger: true, divider: true, onClick: () => setCancelOpen(true) }] : []),
    ...(perms.canDelete ? [{ label: 'Hapus draft', icon: <Trash2 />, danger: true, divider: !perms.canCancelInvoice, onClick: () => setConfirm('delete') }] : []),
  ];

  const toolbar = (
    <>
      {editable && (
        <Button variant="secondary" icon={<Save />} loading={busy === 'save'} disabled={!dirty || (busy !== null && busy !== 'save')} onClick={() => void save()} title="Simpan draft (Ctrl+S)">
          Simpan draft
        </Button>
      )}
      {editable && (
        <Button variant="secondary" icon={previewOnly ? <PenLine /> : <Eye />} onClick={() => setPreviewOnly((v) => !v)} className="max-lg:hidden">
          {previewOnly ? 'Kembali mengedit' : 'Pratinjau'}
        </Button>
      )}
      {perms.canSubmit && (
        <Button icon={<Send />} loading={busy === 'submit'} disabled={busy !== null && busy !== 'submit'} onClick={() => setConfirm('submit')}>
          {isInvoice ? 'Terbitkan' : 'Ajukan persetujuan'}
        </Button>
      )}
      {perms.canWithdraw && (
        <Button variant="secondary" icon={<Undo2 />} loading={busy === 'withdraw'} onClick={() => setConfirm('withdraw')}>
          Tarik kembali
        </Button>
      )}
      {perms.canSign && (
        <Button icon={<PenLine />} onClick={() => setSignOpen(true)}>
          Tandatangani
        </Button>
      )}
      {perms.canComplete && (
        <Button icon={<BadgeCheck />} loading={busy === 'complete'} onClick={() => setConfirm('complete')}>
          Tandai selesai
        </Button>
      )}
      {perms.canRecordPayment && (
        <Button icon={<Banknote />} onClick={() => setPaymentOpen(true)}>
          Catat pembayaran
        </Button>
      )}
      <Dropdown
        width="w-48"
        trigger={({ open, toggle }) => (
          <Button
            variant="secondary"
            icon={busy === 'export' ? <Spinner size="sm" /> : <Download />}
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={busy === 'export'}
            className="max-sm:w-full"
          >
            Ekspor
          </Button>
        )}
        items={[
          { label: 'Unduh PDF', icon: <FileText />, onClick: () => void doExport('pdf') },
          { label: 'Unduh DOCX', icon: <FileText />, onClick: () => void doExport('docx') },
        ]}
      />
      <Dropdown
        width="w-56"
        label="Aksi lainnya"
        trigger={({ open, toggle }) => (
          <IconButton icon={<MoreHorizontal />} label="Aksi lainnya" variant="secondary" onClick={toggle} aria-haspopup="menu" aria-expanded={open} className="max-sm:w-full" />
        )}
        items={moreItems}
      />
    </>
  );

  // ── Panel samping ──
  const sidePanels = (
    <>
      {isInvoice && doc.invoice && (
        <PaymentsPanel
          invoice={doc.invoice}
          payments={doc.payments ?? []}
          projectId={projectId}
          isAdmin={viewer.isAdmin}
          onRecord={perms.canRecordPayment ? () => setPaymentOpen(true) : undefined}
          onChanged={query.reload}
          notify={show}
        />
      )}
      <ApprovalsPanel doc={doc} images={images} canSign={perms.canSign} onSign={() => setSignOpen(true)} />
      <Panel>
        <PanelHeader title="Info dokumen" action={<Button size="sm" variant="ghost" icon={<History />} onClick={() => setRevisionsOpen(true)}>Riwayat</Button>} />
        <div className="divide-y divide-adm-line">
          <InfoRow label="Nomor">
            <span className="font-mono text-[13px]">{doc.number}</span>
          </InfoRow>
          <InfoRow label="Tanggal">{tanggal(doc.doc_date)}</InfoRow>
          <InfoRow label="Versi">{doc.version}</InfoRow>
          <InfoRow label="Dibuat">{waktu(doc.created_at)}</InfoRow>
          {doc.submitted_at && <InfoRow label={isInvoice ? 'Diterbitkan' : 'Diajukan'}>{waktu(doc.submitted_at)}</InfoRow>}
          {doc.approved_at && !isInvoice && <InfoRow label="Disetujui">{waktu(doc.approved_at)}</InfoRow>}
          {doc.completed_at && <InfoRow label="Selesai">{waktu(doc.completed_at)}</InfoRow>}
        </div>
      </Panel>
    </>
  );

  const preview = (
    <div className="min-w-0 rounded-[20px] bg-adm-ghost p-2 sm:p-3">
      {previewModel ? <DocumentPreview model={previewModel} /> : <LoadingState label="Menyiapkan pratinjau..." />}
    </div>
  );

  return (
    <div className="pb-10">
      <PageHeader
        back={{ to: workspacePath, label: doc.project_code ? `${doc.project_code} · ${doc.project_name}` : doc.project_name }}
        eyebrow={info.label}
        title={draft.title.trim() || doc.title}
        description={
          <>
            Nomor <span className="font-mono text-adm-fg">{doc.number}</span>
            {doc.client_name ? ` · ${doc.client_name}` : ''}
          </>
        }
        meta={
          <>
            {cancelled ? <PaymentBadge status="dibatalkan" /> : <DocStatusBadge doc={doc} />}
            <Badge tone="mist" dot={false}>
              Versi {doc.version}
            </Badge>
            {dirty && (
              <Badge tone="warning" dot>
                Belum disimpan
              </Badge>
            )}
            {!editable && (
              <span className="inline-flex items-center gap-1 text-xs text-adm-muted">
                <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                Hanya baca
              </span>
            )}
          </>
        }
      >
        {/* Toolbar di bawah judul (bukan di kanan) agar judul dokumen tidak terhimpit di layar 1024–1366 px */}
        <div role="group" aria-label="Aksi dokumen" className="flex flex-wrap items-center gap-2 max-sm:[&>*]:min-w-[calc(50%-4px)] max-sm:[&>*]:grow">
          {toolbar}
        </div>
      </PageHeader>

      {/* Pemberitahuan status */}
      <div className="mb-4 space-y-3 empty:hidden sm:mb-5">
        {doc.status === 'draft' && doc.revision_requested && (
          <Notice tone="danger" title="Klien meminta revisi">
            {doc.review_note || 'Tanpa catatan.'} Perbaiki isinya lalu ajukan lagi.
          </Notice>
        )}
        {cancelled && <Notice tone="danger" title="Invoice dibatalkan">Invoice ini tidak bisa diterbitkan atau dibayar lagi. Buat invoice baru bila perlu.</Notice>}
        {doc.doc_type === 'receipt' && doc.review_note && <Notice tone="danger" title={doc.review_note}>Pembayaran kuitansi ini sudah dihapus; kuitansi tetap disimpan sebagai riwayat.</Notice>}
        {doc.status === 'draft' && !perms.editable && !cancelled && doc.doc_type !== 'receipt' && (
          <Notice tone="mist" icon={<Lock />}>
            Hanya administrator yang bisa mengubah dokumen {docShort(doc.doc_type)}. Kamu bisa melihat dan mengekspornya.
          </Notice>
        )}
        {doc.status === 'menunggu_persetujuan' && (
          <Notice tone="warning" icon={<Lock />} title="Menunggu persetujuan klien">
            Diajukan {waktu(doc.submitted_at)}. Dokumen terkunci{perms.canWithdraw ? '; tarik kembali bila perlu mengubah isinya.' : '.'}
          </Notice>
        )}
        {(doc.status === 'disetujui' || doc.status === 'selesai') && doc.doc_type !== 'receipt' && !cancelled && (
          <Notice tone={doc.status === 'selesai' ? 'mint' : 'cobalt'} icon={<CheckCircle2 />} title={doc.status === 'selesai' ? 'Dokumen selesai' : isInvoice ? 'Invoice sudah terbit' : 'Disetujui klien'}>
            Isi dan data dokumen dibekukan pada versi {doc.version}.{perms.canChange ? ' Gunakan "Ajukan perubahan" di menu lainnya untuk membuat versi baru.' : ''}
          </Notice>
        )}
        {missingCount > 0 && (
          <Notice tone="warning" icon={<AlertTriangle />} title={`${missingCount} data belum lengkap dan tampil sebagai […]`}>
            <ul className="mt-1 space-y-1">
              {missing.map((g) => (
                <li key={g.label} className="flex flex-wrap items-center gap-1.5">
                  {g.to ? (
                    <Link to={g.to} className="font-medium underline-offset-2 hover:underline">
                      {g.label}:
                    </Link>
                  ) : (
                    <span className="font-medium">{g.label}:</span>
                  )}
                  {g.fields.map((f) => (
                    <code key={f} className="rounded bg-adm-surface/70 px-1.5 py-0.5 font-mono text-[11px]">
                      {f}
                    </code>
                  ))}
                </li>
              ))}
            </ul>
          </Notice>
        )}
      </div>

      {editable ? (
        <>
          {/* HP & tablet: pilih edit atau pratinjau */}
          <Segmented<'edit' | 'preview'>
            ariaLabel="Tampilan editor"
            value={mobileView}
            onChange={setMobileView}
            items={[
              { value: 'edit', label: 'Edit', icon: <PenLine /> },
              { value: 'preview', label: 'Pratinjau', icon: <Eye /> },
            ]}
            className="mb-4 lg:hidden"
            fullWidth
          />
          <div className={cn('grid gap-4 sm:gap-5', showEditor && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]')}>
            {showEditor && (
              <div className={cn('min-w-0 space-y-4 sm:space-y-5', mobileView === 'preview' && 'max-lg:hidden')}>
                <Panel>
                  <PanelHeader title="Informasi dokumen" subtitle="Judul untuk daftar dokumen, tanggal untuk nomor surat dan &quot;Pada hari ini …&quot;." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Judul dokumen" htmlFor="doc-title" required error={titleError} className="sm:col-span-2">
                      <Input
                        id="doc-title"
                        value={draft.title}
                        maxLength={255}
                        onChange={(e) => {
                          updateDraft({ title: e.target.value });
                          if (titleError) setTitleError(null);
                        }}
                        invalid={!!titleError}
                      />
                    </Field>
                    <Field label="Tanggal dokumen" htmlFor="doc-date">
                      <Input id="doc-date" type="date" value={draft.doc_date} onChange={(e) => updateDraft({ doc_date: e.target.value })} />
                    </Field>
                    <Field label="Judul di halaman" htmlFor="doc-heading" hint="Kosongkan untuk judul bawaan.">
                      <Input
                        id="doc-heading"
                        value={draft.content.title ?? ''}
                        maxLength={255}
                        onChange={(e) => updateDraft({ content: { ...draft.content, title: e.target.value } })}
                        placeholder={info.label}
                      />
                    </Field>
                    <Field label="Catatan perubahan" htmlFor="doc-note" optional hint="Tersimpan di riwayat revisi saat kamu menyimpan." className="sm:col-span-2">
                      <Input id="doc-note" value={changeNote} maxLength={500} onChange={(e) => setChangeNote(e.target.value)} placeholder="mis. Menambah fitur laporan di kebutuhan fungsional" />
                    </Field>
                  </div>
                </Panel>

                <Panel>
                  <PanelHeader title="Isi dokumen" subtitle="Ubah, sembunyikan, atau urutkan bagian. Pratinjau di samping ikut berubah." />
                  <div className="mb-3">
                    <MarkupHelp onInsert={insertToken} />
                  </div>
                  <SectionsEditor
                    sections={draft.content.sections}
                    onChange={setSections}
                    hints={SECTION_HINTS[doc.doc_type] ?? {}}
                    onBodyFocus={(sectionId, el) => {
                      lastBody.current = { sectionId, el };
                    }}
                  />
                </Panel>

                {sidePanels}
              </div>
            )}
            <div className={cn('min-w-0', showEditor && mobileView === 'edit' && 'max-lg:hidden', showEditor && 'lg:sticky lg:top-4 lg:self-start')}>
              {preview}
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{preview}</div>
          <div className="min-w-0 space-y-4 sm:space-y-5">{sidePanels}</div>
        </div>
      )}

      {/* Lapisan */}
      <RevisionsDrawer
        open={revisionsOpen}
        onClose={() => setRevisionsOpen(false)}
        revisions={doc.revisions}
        currentVersion={doc.version}
        canRestore={perms.canRestore}
        dirty={dirty}
        onRestore={async (version) => {
          try {
            const res = await pdDocumentRestore({ id: doc.id, version });
            show('success', `Versi ${version} berhasil dipulihkan sebagai versi ${res.version}.`);
            setRevisionsOpen(false);
            query.reload();
          } catch (err) {
            show('error', `Gagal memulihkan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
          }
        }}
      />
      {perms.canSign && (
        <SignModal
          open={signOpen}
          onClose={() => setSignOpen(false)}
          documentId={doc.id}
          documentLabel={label}
          version={doc.version}
          contentHash={doc.content_hash}
          companyName={doc.merge.company.name}
          defaultName={settings?.company.signatory_name || doc.merge.company.signatory_name}
          defaultTitle={settings?.company.signatory_title || doc.merge.company.signatory_title}
          onSigned={(res) => {
            setSignOpen(false);
            show('success', res.status === 'selesai' ? 'Dokumen ditandatangani kedua pihak dan selesai.' : 'Dokumen berhasil ditandatangani.');
            query.reload();
          }}
          onConflict={(message) => {
            setSignOpen(false);
            show('error', message);
            query.reload();
          }}
          notify={show}
        />
      )}
      <ReasonModal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Ajukan perubahan dokumen?"
        description={`${label} dibuka lagi sebagai draft versi baru. Persetujuan dan tanda tangan versi lama tetap di riwayat tetapi tidak berlaku untuk versi baru.`}
        label="Alasan perubahan"
        placeholder="mis. Klien menambah modul laporan sesuai adendum tanggal 21 Oktober."
        confirmText="Ya, ajukan perubahan"
        minLength={10}
        icon={<FilePen />}
        notify={show}
        errorTitle="Gagal mengajukan perubahan."
        onSubmit={async (reason) => {
          await pdDocumentChange({ id: doc.id, reason });
          setChangeOpen(false);
          show('success', 'Perubahan diajukan. Dokumen kembali menjadi draft.');
          query.reload();
        }}
      />
      {perms.canCancelInvoice && doc.invoice && (
        <ReasonModal
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title={`Batalkan invoice ${doc.number}?`}
          description="Invoice yang dibatalkan tetap tersimpan di riwayat dan termin bisa ditagih ulang."
          label="Alasan pembatalan"
          placeholder="mis. Nilai termin berubah setelah adendum."
          confirmText="Ya, batalkan"
          tone="danger"
          icon={<Ban />}
          notify={show}
          errorTitle="Gagal membatalkan invoice."
          onSubmit={async (reason) => {
            if (!doc.invoice) return;
            await pdInvoiceCancel({ id: doc.invoice.id, reason });
            setCancelOpen(false);
            show('success', `Invoice ${doc.number} berhasil dibatalkan.`);
            query.reload();
          }}
        />
      )}
      {isInvoice && doc.invoice && (
        <InvoiceFormModal
          open={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          mode={{ kind: 'edit', invoice: doc.invoice }}
          project={doc.merge.project}
          tax={settings?.tax ?? null}
          content={draft.content}
          onSaved={() => {
            setInvoiceOpen(false);
            show('success', 'Invoice berhasil diperbarui.');
            query.reload();
          }}
          notify={show}
        />
      )}
      {isInvoice && doc.invoice && (
        <PaymentFormModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          invoice={doc.invoice}
          receiptContent={defaultContent('receipt', doc.merge)}
          onSaved={(res) => {
            setPaymentOpen(false);
            show('success', `Pembayaran berhasil dicatat. Kuitansi ${res.receipt_number} terbit.`);
            query.reload();
          }}
          notify={show}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => (busy ? undefined : setConfirm(null))}
        onConfirm={confirmAction}
        loading={busy !== null && busy !== 'export'}
        tone={confirm === 'delete' ? 'danger' : 'default'}
        title={
          confirm === 'submit'
            ? isInvoice
              ? 'Terbitkan invoice?'
              : 'Ajukan ke klien?'
            : confirm === 'withdraw'
              ? 'Tarik kembali pengajuan?'
              : confirm === 'complete'
                ? 'Tandai dokumen selesai?'
                : 'Hapus draft dokumen?'
        }
        description={
          confirm === 'submit' ? (
            <>
              {isInvoice
                ? 'Invoice dikunci dan klien mendapat notifikasi untuk membayar.'
                : 'Dokumen dikunci dan klien mendapat notifikasi untuk meninjau dan menyetujuinya.'}
              {dirty && ' Perubahan yang belum disimpan ikut disimpan dulu.'}
              {missingCount > 0 && <span className="mt-2 block font-medium text-adm-warning-fg">Masih ada {missingCount} data kosong yang tampil sebagai […].</span>}
            </>
          ) : confirm === 'withdraw' ? (
            'Dokumen kembali menjadi draft dan bisa diubah lagi. Klien tidak bisa menyetujuinya sampai diajukan ulang.'
          ) : confirm === 'complete' ? (
            'Dokumen dinyatakan selesai dan tidak bisa diubah lagi kecuali lewat "Ajukan perubahan".'
          ) : (
            `${label} dihapus beserta riwayat revisinya. Tindakan ini tidak bisa dibatalkan.`
          )
        }
        confirmText={confirm === 'submit' ? (isInvoice ? 'Ya, terbitkan' : 'Ya, ajukan') : confirm === 'withdraw' ? 'Ya, tarik kembali' : confirm === 'complete' ? 'Ya, tandai selesai' : 'Ya, hapus'}
      />
      <ConfirmDialog
        open={!!guard.pending}
        onClose={guard.cancel}
        onConfirm={guard.proceed}
        tone="danger"
        title="Tinggalkan editor?"
        description="Perubahan yang belum disimpan akan hilang."
        confirmText="Ya, tinggalkan"
        cancelText="Tetap di sini"
      />
      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
