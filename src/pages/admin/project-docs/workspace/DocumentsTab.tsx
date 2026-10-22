// Tab Dokumen: checklist of the project's document set (spec §1, §2 "Missing documents") with status, number,
// version and signatures; actions buat (from the engine template) / buka (editor) / ekspor (PDF, DOCX).
import { useState } from 'react';
import { AlertCircle, ArrowRight, Download, FilePlus2, FileText, PenLine } from 'lucide-react';
import { Badge, Button, Dropdown, Panel, PanelHeader, Spinner, cn } from '../../../../components/admin/ui';
import { pdDocumentCreate } from '../../../../features/project-docs/api';
import { DOC_TYPES } from '../../../../features/project-docs/engine';
import type { ChecklistItem, DocType } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { exportDocumentById, templateFor, type ExportFormat } from '../shared/documents';
import { lowerFirst, requiredLabel, STAGE_LABEL, tanggal } from '../shared/format';
import { DocChip, DocStatusBadge } from '../shared/ui';
import type { WorkspaceContext } from './context';

/** Export menu (PDF / DOCX) of a stored document. */
export function ExportMenu({ docId, onError, size = 'sm' }: { docId: number; onError: (message: string) => void; size?: 'sm' | 'md' }) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await exportDocumentById(docId, format);
    } catch (err) {
      onError(`Gagal mengekspor dokumen: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Dropdown
      width="w-48"
      trigger={({ open, toggle }) => (
        <Button size={size} variant="secondary" icon={busy ? <Spinner size="sm" /> : <Download />} onClick={toggle} aria-haspopup="menu" aria-expanded={open} disabled={!!busy}>
          Ekspor
        </Button>
      )}
      items={[
        { label: 'Unduh PDF', icon: <FileText />, onClick: () => run('pdf') },
        { label: 'Unduh DOCX', icon: <FileText />, onClick: () => run('docx') },
      ]}
    />
  );
}

export function DocumentsTab({ ctx }: { ctx: WorkspaceContext }) {
  const { project, settings, canEditType, notify } = ctx;
  const [creating, setCreating] = useState<DocType | null>(null);
  const open = (docId: number) => ctx.go(`/admin/proyek/${project.id}/dokumen/${docId}`);

  const create = async (type: DocType) => {
    setCreating(type);
    try {
      const res = await pdDocumentCreate({ project_id: project.id, doc_type: type, title: DOC_TYPES[type].label, content: templateFor(type, project, settings) });
      notify('success', `${DOC_TYPES[type].short} ${res.number} berhasil dibuat.`);
      open(res.id);
    } catch (err) {
      notify('error', `Gagal membuat dokumen: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      setCreating(null);
    }
  };

  const required = project.checklist.filter((c) => c.required);
  const done = required.filter((c) => c.document && (c.document.status === 'disetujui' || c.document.status === 'selesai')).length;

  const actions = (item: ChecklistItem) => {
    const { doc_type: type, document: doc } = item;
    if (type === 'receipt' && !doc) return <span className="text-xs text-adm-muted">Terbit otomatis saat pembayaran dicatat</span>;
    if (type === 'invoice' || type === 'receipt') {
      return (
        <Button size="sm" variant={item.missing ? 'primary' : 'secondary'} iconRight={<ArrowRight />} onClick={() => ctx.openTab('invoice')}>
          {/* Developer: finance is read-only, the tab only lists invoices */}
          {type === 'receipt' ? 'Lihat kuitansi' : !ctx.isAdmin ? 'Lihat invoice' : doc ? 'Kelola invoice' : 'Buat invoice'}
        </Button>
      );
    }
    if (doc) {
      return (
        <>
          <ExportMenu docId={doc.id} onError={(m) => notify('error', m)} />
          <Button size="sm" variant="secondary" iconRight={<ArrowRight />} onClick={() => open(doc.id)}>
            Buka
          </Button>
        </>
      );
    }
    const allowed = canEditType(type);
    return (
      <Button
        size="sm"
        variant={item.missing ? 'primary' : 'secondary'}
        icon={<FilePlus2 />}
        loading={creating === type}
        disabled={!allowed || (creating !== null && creating !== type)}
        title={allowed ? undefined : 'Hanya administrator yang bisa membuat dokumen ini.'}
        onClick={() => create(type)}
      >
        Buat
      </Button>
    );
  };

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <PanelHeader
          title="Checklist dokumen"
          subtitle="Dokumen wajib mengikuti tahapan proyek. MoU dan SLA wajib bila diaktifkan di Ringkasan."
          action={
            <span className="text-[13px] font-semibold tabular-nums text-adm-fg">
              {done}/{required.length} <span className="font-normal text-adm-muted">disetujui</span>
            </span>
          }
        />
      </div>
      <ul className="divide-y divide-adm-line border-t border-adm-line">
        {project.checklist.map((item) => {
          const info = DOC_TYPES[item.doc_type];
          const doc = item.document;
          const parties = info.parties.length;
          const signed = doc?.signed_parties.length ?? 0;
          return (
            <li key={item.doc_type} className={cn('flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center', item.missing && 'bg-adm-warning-soft/40')}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <DocChip type={item.doc_type} className="mt-0.5 w-[76px] justify-center" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-adm-fg">{info.label}</p>
                    {doc ? (
                      <DocStatusBadge doc={doc} size="sm" />
                    ) : (
                      <Badge tone="mist" size="sm" dot={false}>
                        Belum dibuat
                      </Badge>
                    )}
                    {item.missing && (
                      <Badge tone="warning" size="sm" icon={<AlertCircle />}>
                        Belum lengkap
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-adm-muted">
                    <span>Tahap {lowerFirst(STAGE_LABEL[item.stage])}</span>
                    <span aria-hidden>·</span>
                    <span>{requiredLabel(item.doc_type, item.required)}</span>
                    {doc && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-mono text-adm-fg">{doc.number}</span>
                        <span aria-hidden>·</span>
                        <span>Versi {doc.version}</span>
                        <span aria-hidden>·</span>
                        <span>{tanggal(doc.doc_date)}</span>
                      </>
                    )}
                    {item.count > 1 && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{item.count} dokumen</span>
                      </>
                    )}
                    {doc && parties > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span className={cn('inline-flex items-center gap-1', signed >= parties ? 'text-adm-mint-fg' : '')}>
                          <PenLine className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                          {signed}/{parties} tanda tangan
                        </span>
                      </>
                    )}
                  </p>
                  {doc?.revision_requested && doc.review_note && (
                    <p className="mt-2 rounded-lg bg-adm-danger-soft px-2.5 py-1.5 text-xs text-adm-danger-fg">Catatan klien: {doc.review_note}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[88px] md:pl-0">{actions(item)}</div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
