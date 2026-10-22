// Riwayat revisi (pd_document_revisions, terbaru dulu) dengan pulihkan versi lama (pd_document_restore, hanya draft):
// isi versi lama disimpan sebagai versi baru, jadi riwayat tidak pernah hilang (spec §1.2).
import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Drawer, EmptyState } from '../../../../components/admin/ui';
import type { Revision } from '../../../../features/project-docs/types';
import { relatif, waktu } from '../shared/format';

export function RevisionsDrawer({
  open,
  onClose,
  revisions,
  currentVersion,
  canRestore,
  dirty,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  revisions: Revision[];
  currentVersion: number;
  /** draft + allowed to edit this type */
  canRestore: boolean;
  /** unsaved edits are lost on restore */
  dirty: boolean;
  onRestore: (version: number) => Promise<void>;
}) {
  const [target, setTarget] = useState<Revision | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Riwayat revisi" description="Setiap simpan membuat versi baru. Versi lama bisa dipulihkan selama dokumen masih draft.">
        {revisions.length === 0 ? (
          <EmptyState size="sm" icon={<History />} title="Belum ada revisi." />
        ) : (
          <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-adm-line">
            {revisions.map((r) => {
              const current = r.version === currentVersion;
              return (
                <li key={r.version} className="relative flex gap-3 rounded-xl py-2.5 pl-0 pr-1">
                  <span
                    className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${current ? 'bg-cobalt text-white' : 'bg-adm-ghost text-adm-muted ring-4 ring-adm-surface'}`}
                  >
                    v{r.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-adm-fg">Versi {r.version}</p>
                      {current && (
                        <Badge tone="cobalt" size="sm" dot={false}>
                          Saat ini
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-adm-fg">{r.change_note || <span className="text-adm-subtle">Tanpa catatan</span>}</p>
                    <p className="mt-0.5 text-xs text-adm-muted" title={waktu(r.created_at)}>
                      {r.changed_by_name || 'Sistem'} · {relatif(r.created_at)}
                    </p>
                  </div>
                  {canRestore && !current && (
                    <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setTarget(r)} className="shrink-0 self-start">
                      Pulihkan
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Drawer>
      <ConfirmDialog
        open={!!target}
        onClose={() => (busy ? undefined : setTarget(null))}
        loading={busy}
        onConfirm={async () => {
          if (!target) return;
          setBusy(true);
          try {
            await onRestore(target.version);
            setTarget(null);
          } finally {
            setBusy(false);
          }
        }}
        title={`Pulihkan versi ${target?.version ?? ''}?`}
        description={
          dirty
            ? 'Isi versi ini disimpan sebagai versi baru. Perubahan yang belum kamu simpan akan hilang.'
            : 'Isi versi ini disimpan sebagai versi baru; versi lain tetap ada di riwayat.'
        }
        confirmText="Ya, pulihkan"
      />
    </>
  );
}
