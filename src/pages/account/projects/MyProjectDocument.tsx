// Dokumen proyek (/akun/proyek/:id/dokumen/:docId): A4 preview (engine DocumentPreview with the downloaded signature
// images), PDF / DOCX download, and for a document waiting for the client: approve (with e-signature as Pihak Kedua
// for MoU/PKS/UAT/BAST/SLA) or request a revision with a note (pd_my_document, pd_my_document_decide;
// docs/platform/PROJECT-DOCS-SPEC.md §1.1, §7 Customer). Drafts are never served to a client (404).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleCheck,
  Download,
  FileCheck2,
  FileText,
  FileType2,
  History,
  LoaderCircle,
  MessageSquareText,
  ReceiptText,
  RefreshCw,
  Signature as SignatureIcon,
  WalletCards,
} from 'lucide-react';
import { pdMyDocument, pdMyDocumentDecide } from '../../../features/project-docs/api';
import { DOC_TYPES, DocumentPreview } from '../../../features/project-docs/engine';
import {
  PARTY_LABEL,
  PAYMENT_METHOD_LABEL,
  type DocDetail,
  type DocStatus,
  type MyDocumentDecideResponse,
  type Party,
} from '../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/auth';
import { formatRupiah, formatTanggal } from '../../../types/platform';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Notice } from '../components/Notice';
import { useDocumentTitle } from '../components/payment';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { RevisionDialog, SignApproveDialog } from './components/DecisionDialogs';
import { exportModel, modelOf, signatureRefs, useSignatureImages, withSignatureImages, type ExportFormat } from './components/documents';
import { SectionCard, TonePill } from './components/ProjectParts';
import {
  awaitsCompanySignature,
  docShortLabel,
  docStatusView,
  invoiceStatusView,
  isCancelled,
  needsClientSignature,
  routeId,
  type ProjectFlash,
  type ProjectNavState,
} from './components/projectCopy';
import { useScrollReset } from './components/useScrollReset';

type LoadState = { status: 'loading' } | { status: 'not_found' } | { status: 'error'; message: string } | { status: 'ready'; doc: DocDetail };
type Dialog = 'sign' | 'approve' | 'revise' | null;

export default function MyProjectDocument() {
  const params = useParams();
  const projectId = routeId(params.id);
  const docId = routeId(params.docId);
  const navigate = useNavigate();
  useScrollReset();
  const [state, setState] = useState<LoadState>(docId ? { status: 'loading' } : { status: 'not_found' });
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<ProjectFlash | null>(null);
  const backPath = projectId ? `/akun/proyek/${projectId}` : '/akun/proyek';

  useDocumentTitle(state.status === 'ready' ? state.doc.title : 'Dokumen proyek');

  const fetchDoc = useCallback(
    () => (docId ? pdMyDocument({ id: docId }).then((res) => res.document) : Promise.reject(new ApiError('Dokumen tidak ditemukan.', 404))),
    [docId],
  );

  const toState = (err: unknown): LoadState =>
    err instanceof ApiError && err.status === 404
      ? { status: 'not_found' }
      : { status: 'error', message: errorMessage(err, 'Dokumen belum bisa dimuat. Silakan coba lagi.') };

  useEffect(() => {
    if (!docId) return;
    let alive = true;
    fetchDoc()
      .then((doc) => alive && setState({ status: 'ready', doc }))
      .catch((err: unknown) => alive && setState(toState(err)));
    return () => {
      alive = false;
    };
  }, [docId, fetchDoc]);

  const reload = async () => {
    const wasReady = state.status === 'ready';
    setRefreshing(true);
    if (!wasReady) setState({ status: 'loading' });
    try {
      setState({ status: 'ready', doc: await fetchDoc() });
    } catch (err) {
      if (wasReady && !(err instanceof ApiError && err.status === 404)) setFlash({ tone: 'danger', text: errorMessage(err, 'Gagal memuat ulang dokumen.') });
      else setState(toState(err));
    } finally {
      setRefreshing(false);
    }
  };

  // Revision requested: the document is a draft again (hidden from the client) → back to the project with a message
  const onRevisionSent = (title: string) => {
    const navState: ProjectNavState = {
      flash: {
        tone: 'success',
        title: 'Permintaan revisi terkirim',
        text: `Tim kami akan memperbaiki ${title} lalu mengirimkannya lagi untuk Anda tinjau.`,
      },
    };
    navigate(backPath, { state: navState });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-4 sm:px-8 sm:pb-20 sm:pt-8">
      <Link to={backPath} className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Detail proyek
      </Link>

      <div className="mt-3" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <DocumentSkeleton />}
        {state.status === 'error' && <ErrorState title="Dokumen belum bisa dimuat" message={state.message} onRetry={reload} retrying={refreshing} />}
        {state.status === 'not_found' && (
          <EmptyState
            icon={<FileText className="h-7 w-7" aria-hidden />}
            title="Dokumen tidak ditemukan"
            description="Dokumen ini tidak ada di proyek Anda atau sedang direvisi oleh tim kami. Dokumen yang direvisi tampil lagi setelah dikirim ulang."
            action={
              <Link to={backPath} className="btn btn-primary">
                Kembali ke detail proyek
              </Link>
            }
          />
        )}
        {state.status === 'ready' && (
          <DocumentView
            doc={state.doc}
            flash={flash}
            onFlash={setFlash}
            refreshing={refreshing}
            onReload={reload}
            onRevisionSent={() => onRevisionSent(state.doc.title)}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Tampilan dokumen ─────────────────────────── */

function DocumentView({
  doc,
  flash,
  onFlash,
  refreshing,
  onReload,
  onRevisionSent,
}: {
  doc: DocDetail;
  flash: ProjectFlash | null;
  onFlash: (flash: ProjectFlash | null) => void;
  refreshing: boolean;
  onReload: () => Promise<void>;
  onRevisionSent: () => void;
}) {
  const model = useMemo(() => modelOf(doc), [doc]);
  const refs = useMemo(() => [...signatureRefs(model), ...doc.signatures.map((s) => s.image_url).filter(Boolean)], [model, doc]);
  const images = useSignatureImages(refs);
  const shown = useMemo(() => withSignatureImages(model, images), [model, images]);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const pending = doc.status === 'menunggu_persetujuan';
  const sign = needsClientSignature(doc.doc_type);
  const accountName = getCurrentUser()?.name ?? '';

  // The result message sits at the top of the page; bring it into view (the decision was taken further down)
  const showFlash = (next: ProjectFlash) => {
    onFlash(next);
    window.scrollTo({ top: 0 });
  };

  const afterDecision = async (result: MyDocumentDecideResponse, signed: boolean) => {
    setDialog(null);
    showFlash(
      result.status === 'selesai'
        ? { tone: 'success', title: 'Dokumen selesai', text: 'Terima kasih. Semua pihak sudah menandatangani dokumen ini.' }
        : signed
          ? { tone: 'success', title: 'Dokumen disetujui dan ditandatangani', text: 'Terima kasih, tanda tangan Anda sudah tercatat.' }
          : { tone: 'success', title: 'Dokumen disetujui', text: 'Terima kasih, persetujuan Anda sudah kami terima.' },
    );
    await onReload();
  };

  // 409: the document changed meanwhile (withdrawn, already decided) → explain and show the current state
  const onConflict = async (message: string) => {
    setDialog(null);
    showFlash({ tone: 'warning', title: 'Dokumen sudah berubah', text: message });
    await onReload();
  };

  const approve = async () => {
    setApproving(true);
    setApproveError(null);
    try {
      await afterDecision(await pdMyDocumentDecide({ id: doc.id, decision: 'approved', content_hash: doc.content_hash ?? undefined }), false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) await onConflict(err.message);
      else setApproveError(`Gagal menyetujui dokumen: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setApproving(false);
    }
  };

  const download = async (format: ExportFormat) => {
    setExporting(format);
    try {
      await exportModel(model, format, images);
    } catch (err) {
      onFlash({ tone: 'danger', text: `Gagal mengunduh ${format.toUpperCase()}: ${errorMessage(err, 'kesalahan tidak diketahui')}` });
    } finally {
      setExporting(null);
    }
  };

  const openDecision = (which: 'approve' | 'revise') => {
    setApproveError(null);
    setDialog(which === 'revise' ? 'revise' : sign ? 'sign' : 'approve');
  };

  const statusView = docStatusView(doc);
  const approveLabel = sign ? 'Setujui & tandatangani' : 'Setujui dokumen';

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            {docShortLabel(doc.doc_type)} · <span className="tabular-nums text-fg">{doc.number}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{doc.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <TonePill view={statusView} />
            <span className="text-xs text-subtle">
              Versi {doc.version} · {formatTanggal(doc.doc_date)}
            </span>
          </div>
        </div>
        <button type="button" onClick={() => void onReload()} disabled={refreshing} className="btn btn-outline btn-sm self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Muat ulang
        </button>
      </header>

      <div className="mt-5 space-y-3 empty:hidden">
        {flash && (
          <Notice tone={flash.tone} title={flash.title} onClose={() => onFlash(null)}>
            {flash.text}
          </Notice>
        )}
        <StatusNotice doc={doc} />
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <section aria-label="Pratinjau dokumen" className="min-w-0 rounded-[24px] bg-alt p-2.5 ring-1 ring-inset ring-line sm:p-4">
          <DocumentPreview model={shown} />
        </section>

        <div className="order-first min-w-0 space-y-5 lg:order-none lg:sticky lg:top-24">
          {pending && (
            <SectionCard title="Keputusan Anda" icon={<FileCheck2 className="h-[18px] w-[18px]" aria-hidden />} className="hidden lg:block">
              <p className="text-[13px] leading-relaxed text-muted">
                {sign
                  ? 'Sudah sesuai? Setujui dan tandatangani secara elektronik. Belum sesuai? Minta revisi dengan catatan.'
                  : 'Sudah sesuai? Setujui dokumen ini. Belum sesuai? Minta revisi dengan catatan.'}
              </p>
              <div className="mt-4 space-y-2">
                <DecisionButtons approveLabel={approveLabel} sign={sign} onDecide={openDecision} />
              </div>
            </SectionCard>
          )}

          <SectionCard title="Unduh dokumen" icon={<Download className="h-[18px] w-[18px]" aria-hidden />}>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-outline" onClick={() => download('pdf')} disabled={exporting !== null}>
                {exporting === 'pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
                PDF
              </button>
              <button type="button" className="btn btn-outline" onClick={() => download('docx')} disabled={exporting !== null}>
                {exporting === 'docx' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FileType2 className="h-4 w-4" aria-hidden />}
                DOCX
              </button>
            </div>
            <p className="mt-3 text-xs text-subtle">
              File berisi versi {doc.version}
              {doc.signatures.length > 0 ? ' beserta tanda tangan elektronik yang sudah dibubuhkan.' : ' dokumen ini.'}
            </p>
          </SectionCard>

          {doc.invoice && <InvoiceSummaryCard doc={doc} />}
          {DOC_TYPES[doc.doc_type].parties.length > 0 && <SignaturesCard doc={doc} images={images} />}
          {doc.approvals.length > 0 && <ApprovalsCard doc={doc} />}
        </div>
      </div>

      {/* HP: tombol keputusan selalu terjangkau di bawah layar selama membaca dokumen */}
      {pending && (
        <div className="sticky bottom-0 z-30 -mx-5 mt-5 border-t border-line bg-surface/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            <DecisionButtons approveLabel={sign ? 'Setujui & tanda tangan' : 'Setujui'} sign={sign} onDecide={openDecision} compact />
          </div>
        </div>
      )}

      <SignApproveDialog
        open={dialog === 'sign'}
        doc={doc}
        accountName={accountName}
        onClose={() => setDialog(null)}
        onDone={(result) => void afterDecision(result, true)}
        onConflict={(message) => void onConflict(message)}
      />
      <RevisionDialog
        open={dialog === 'revise'}
        doc={doc}
        onClose={() => setDialog(null)}
        onDone={() => {
          setDialog(null);
          onRevisionSent();
        }}
        onConflict={(message) => void onConflict(message)}
      />
      <ConfirmDialog
        open={dialog === 'approve'}
        title="Setujui dokumen ini?"
        description={
          <>
            Anda menyatakan isi <span className="font-semibold text-fg">{doc.title}</span> versi {doc.version} sudah sesuai. Persetujuan
            dicatat bersama waktu dan perangkat Anda.
          </>
        }
        confirmLabel="Ya, setujui"
        cancelLabel="Batal"
        loading={approving}
        error={approveError}
        onConfirm={approve}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

function DecisionButtons({
  approveLabel,
  sign,
  onDecide,
  compact = false,
}: {
  approveLabel: string;
  sign: boolean;
  onDecide: (which: 'approve' | 'revise') => void;
  compact?: boolean;
}) {
  return (
    <>
      <button type="button" className={`btn btn-primary ${compact ? 'order-last' : 'w-full'}`} onClick={() => onDecide('approve')}>
        {sign ? <SignatureIcon className="h-4 w-4" aria-hidden /> : <CircleCheck className="h-4 w-4" aria-hidden />}
        {approveLabel}
      </button>
      <button type="button" className={`btn btn-outline ${compact ? '' : 'w-full'}`} onClick={() => onDecide('revise')}>
        <MessageSquareText className="h-4 w-4" aria-hidden />
        Minta revisi
      </button>
    </>
  );
}

const STATUS_TEXT: Partial<Record<DocStatus, string>> = {
  disetujui: 'Anda sudah menyetujui dokumen ini.',
  selesai: 'Dokumen ini sudah selesai dan berlaku.',
};

/** What the current status means for the client. */
function StatusNotice({ doc }: { doc: DocDetail }) {
  if (doc.doc_type === 'receipt' || doc.doc_type === 'invoice') {
    if (isCancelled(doc)) {
      return (
        <Notice tone="warning" title={doc.doc_type === 'receipt' ? 'Kuitansi dibatalkan' : 'Invoice dibatalkan'}>
          {doc.review_note && doc.review_note.length > 'Dibatalkan'.length ? doc.review_note : 'Dokumen ini tidak berlaku lagi.'}
        </Notice>
      );
    }
    const inv = doc.doc_type === 'invoice' ? doc.invoice : undefined;
    if (!inv?.overdue) return null;
    return (
      <Notice tone="danger" title="Tagihan lewat jatuh tempo">
        Sisa tagihan <span className="font-semibold tabular-nums">{formatRupiah(inv.remaining)}</span> jatuh tempo {formatTanggal(inv.due_date)}. Sudah
        membayar? Kuitansi terbit setelah pembayaran kami terima.
      </Notice>
    );
  }
  if (doc.status === 'menunggu_persetujuan') {
    return (
      <Notice tone="warning" title="Dokumen ini menunggu persetujuan Anda">
        {needsClientSignature(doc.doc_type)
          ? 'Periksa isinya. Bila sudah sesuai, setujui sekaligus tandatangani secara elektronik; bila belum, minta revisi dengan catatan.'
          : 'Periksa isinya. Bila sudah sesuai, setujui; bila belum, minta revisi dengan catatan.'}
      </Notice>
    );
  }
  if (awaitsCompanySignature(doc)) {
    return (
      <Notice tone="info" title="Menunggu tanda tangan kami">
        Anda sudah menyetujui{doc.signed_parties.includes('pihak_kedua') ? ' dan menandatangani' : ''} dokumen ini. Kami akan menandatanganinya
        sebagai Pihak Pertama.
      </Notice>
    );
  }
  const text = STATUS_TEXT[doc.status];
  return text ? <Notice tone="success">{text}</Notice> : null;
}

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-sm tabular-nums text-fg ${strong ? 'font-semibold' : 'font-medium'}`}>{children}</dd>
    </div>
  );
}

const docPath = (doc: DocDetail, id: number) => `/akun/proyek/${doc.project_id}/dokumen/${id}`;

/** Invoice documents: amounts, status and payments; receipts: the payment and the invoice it paid. */
function InvoiceSummaryCard({ doc }: { doc: DocDetail }) {
  const inv = doc.invoice;
  if (!inv) return null;

  if (doc.doc_type === 'receipt') {
    const payment = doc.merge.payment;
    return (
      <SectionCard title="Pembayaran" icon={<ReceiptText className="h-[18px] w-[18px]" aria-hidden />}>
        <dl className="divide-y divide-line">
          {payment && (
            <Row label="Jumlah" strong>
              {formatRupiah(payment.amount)}
            </Row>
          )}
          {payment?.paid_at && <Row label="Dibayar pada">{formatTanggal(payment.paid_at)}</Row>}
          {payment?.method && <Row label="Metode">{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</Row>}
          <Row label="Untuk invoice">
            <Link to={docPath(doc, inv.document_id)} className="link-site">
              {inv.number}
            </Link>
          </Row>
        </dl>
      </SectionCard>
    );
  }

  const payments = doc.payments ?? [];
  return (
    <SectionCard title="Tagihan" icon={<WalletCards className="h-[18px] w-[18px]" aria-hidden />} aside={<TonePill view={invoiceStatusView(inv)} />}>
      <dl className="divide-y divide-line">
        <Row label="Total">{formatRupiah(inv.total)}</Row>
        {inv.pph23_amount > 0 && <Row label="Dipotong PPh 23">− {formatRupiah(inv.pph23_amount)}</Row>}
        <Row label="Jumlah tagihan" strong>
          {formatRupiah(inv.amount_due)}
        </Row>
        {inv.amount_paid > 0 && <Row label="Sudah dibayar">{formatRupiah(inv.amount_paid)}</Row>}
        {inv.payment_status !== 'lunas' && inv.payment_status !== 'dibatalkan' && (
          <>
            <Row label="Sisa" strong>
              {formatRupiah(inv.remaining)}
            </Row>
            <Row label="Jatuh tempo">
              <span className={inv.overdue ? 'text-danger-700' : ''}>{formatTanggal(inv.due_date)}</span>
            </Row>
          </>
        )}
      </dl>
      {payments.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-[13px] font-semibold text-fg">Pembayaran diterima</h3>
          <ul className="mt-2 space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl bg-alt px-3.5 py-2.5 text-[13px]">
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums text-fg">{formatRupiah(p.amount)}</p>
                  <p className="text-xs text-subtle">
                    {formatTanggal(p.paid_at)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  </p>
                </div>
                {p.receipt_document_id && (
                  <Link to={docPath(doc, p.receipt_document_id)} className="link-site shrink-0 text-xs">
                    Kuitansi
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

/** Signature slots of the current version (Pihak Pertama = the company, Pihak Kedua = the client). */
function SignaturesCard({ doc, images }: { doc: DocDetail; images: Record<string, string> }) {
  const parties = DOC_TYPES[doc.doc_type].parties;
  const organization: Record<Party, string> = { pihak_pertama: doc.merge.company.name, pihak_kedua: doc.merge.client.name };
  return (
    <SectionCard title="Tanda tangan" icon={<SignatureIcon className="h-[18px] w-[18px]" aria-hidden />}>
      <ul className="space-y-3">
        {parties.map((party) => {
          const sig = doc.signatures.find((s) => s.party === party && s.version === doc.version);
          const image = sig ? images[sig.image_url] : undefined;
          return (
            <li key={party} className="rounded-2xl p-3.5 ring-1 ring-inset ring-line">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-subtle">{PARTY_LABEL[party]}</p>
              {organization[party] && <p className="mt-0.5 truncate text-[13px] text-muted">{organization[party]}</p>}
              {sig ? (
                <>
                  {image && <img src={image} alt={`Tanda tangan ${sig.signer_name}`} className="mt-2 h-12 max-w-full object-contain" />}
                  <p className="mt-2 text-sm font-semibold text-fg">{sig.signer_name}</p>
                  {sig.signer_title && <p className="text-xs text-muted">{sig.signer_title}</p>}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-700">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                    Ditandatangani secara elektronik · {formatTanggal(sig.signed_at, true)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-subtle">Belum ditandatangani</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-subtle">Tanda tangan elektronik berlaku untuk versi {doc.version}. Perubahan isi memerlukan tanda tangan ulang.</p>
    </SectionCard>
  );
}

const APPROVALS_SHOWN = 5;

function ApprovalsCard({ doc }: { doc: DocDetail }) {
  const shown = doc.approvals.slice(0, APPROVALS_SHOWN);
  return (
    <SectionCard title="Riwayat persetujuan" icon={<History className="h-[18px] w-[18px]" aria-hidden />}>
      <ul className="divide-y divide-line">
        {shown.map((a) => (
          <li key={a.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <TonePill view={a.decision === 'approved' ? { label: 'Disetujui', tone: 'success' } : { label: 'Revisi diminta', tone: 'warning' }} />
              <time className="shrink-0 text-xs tabular-nums text-subtle">{formatTanggal(a.created_at, true)}</time>
            </div>
            <p className="mt-1.5 text-xs text-subtle">
              {a.user_name || 'Klien'} · versi {a.version}
            </p>
            {a.note && <p className="mt-1 whitespace-pre-line break-words text-[13px] text-muted">{a.note}</p>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function DocumentSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-8 w-2/3 sm:h-10" />
      <Skeleton className="mt-3 h-6 w-40" />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="rounded-[24px] bg-alt p-4 ring-1 ring-inset ring-line">
          <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[640px] bg-surface" />
        </div>
        <div className="card-site order-first space-y-3 p-6 lg:order-none">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
