// Panel persetujuan & tanda tangan: slot tanda tangan versi saat ini (Pihak Pertama / Pihak Kedua) dengan jejak
// audit, riwayat keputusan klien, dan sidik dokumen SHA-256 (spec §0 "E-signature", §1.1).
import { CheckCircle2, Fingerprint, PenLine, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Button, Panel, PanelHeader } from '../../../../components/admin/ui';
import { DOC_TYPES } from '../../../../features/project-docs/engine';
import { PARTY_LABEL, type DocDetail, type Party } from '../../../../features/project-docs/types';
import { relatif, waktu } from '../shared/format';

const METHOD_LABEL = { draw: 'digambar', type: 'diketik' } as const;

export function ApprovalsPanel({
  doc,
  images,
  canSign,
  onSign,
}: {
  doc: DocDetail;
  /** signature image object URLs by `pdfile:sig:<id>` reference */
  images: Record<string, string>;
  canSign: boolean;
  onSign: () => void;
}) {
  const info = DOC_TYPES[doc.doc_type];
  const organization: Record<Party, string> = { pihak_pertama: doc.merge.company.name, pihak_kedua: doc.merge.client.name };
  const signable = doc.status === 'menunggu_persetujuan' || doc.status === 'disetujui';

  if (!info.parties.length && info.approval === 'none') return null;

  return (
    <Panel>
      <PanelHeader icon={ShieldCheck} title="Persetujuan & tanda tangan" subtitle={info.parties.length ? `Versi ${doc.version} harus ditandatangani kedua pihak.` : 'Klien menyetujui dokumen ini lewat portal klien.'} />

      {info.parties.length > 0 && (
        <ul className="space-y-2">
          {info.parties.map((party) => {
            const sig = doc.signatures.find((s) => s.party === party && s.version === doc.version);
            const src = sig ? images[sig.image_url] : undefined;
            return (
              <li key={party} className="rounded-2xl bg-adm-ghost p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">{PARTY_LABEL[party]}</p>
                    <p className="truncate text-[13px] font-medium text-adm-fg">{organization[party] || '-'}</p>
                  </div>
                  {sig ? (
                    <Badge tone="mint" size="sm" icon={<CheckCircle2 />}>
                      Ditandatangani
                    </Badge>
                  ) : (
                    <Badge tone="mist" size="sm" dot={false}>
                      Belum
                    </Badge>
                  )}
                </div>
                {sig ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-adm-line">
                      {src ? <img src={src} alt={`Tanda tangan ${sig.signer_name}`} className="max-h-full max-w-full object-contain" /> : <PenLine className="h-4 w-4 text-mist-500" aria-hidden />}
                    </span>
                    <div className="min-w-0 text-xs text-adm-muted">
                      <p className="truncate text-[13px] font-medium text-adm-fg">{sig.signer_name}</p>
                      {sig.signer_title && <p className="truncate">{sig.signer_title}</p>}
                      <p title={[sig.ip && `IP ${sig.ip}`, sig.user_agent].filter(Boolean).join(' · ') || undefined}>
                        {waktu(sig.signed_at)} · {METHOD_LABEL[sig.method]}
                      </p>
                    </div>
                  </div>
                ) : party === 'pihak_pertama' ? (
                  canSign && signable ? (
                    <Button size="sm" icon={<PenLine />} className="mt-2" onClick={onSign}>
                      Tandatangani
                    </Button>
                  ) : (
                    <p className="mt-1.5 text-xs text-adm-muted">{signable ? 'Ditandatangani administrator.' : 'Bisa ditandatangani setelah dokumen diajukan.'}</p>
                  )
                ) : (
                  <p className="mt-1.5 text-xs text-adm-muted">Klien menandatangani saat menyetujui dokumen di portal klien.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {info.approval === 'client' && (
        <div className={info.parties.length ? 'mt-4' : ''}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Riwayat keputusan klien</p>
          {doc.approvals.length === 0 ? (
            <p className="text-[13px] text-adm-muted">{doc.status === 'draft' ? 'Belum diajukan ke klien.' : 'Belum ada keputusan dari klien.'}</p>
          ) : (
            <ol className="space-y-2">
              {doc.approvals.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  {a.decision === 'approved' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-adm-mint-fg" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-adm-danger-fg" strokeWidth={1.75} aria-hidden />
                  )}
                  <div className="min-w-0 text-[13px]">
                    <p className="text-adm-fg">
                      <span className="font-medium">{a.user_name}</span> {a.decision === 'approved' ? 'menyetujui' : 'meminta revisi'} versi {a.version}
                    </p>
                    {a.note && <p className="mt-0.5 rounded-lg bg-adm-ghost px-2 py-1 text-xs text-adm-muted">"{a.note}"</p>}
                    <p className="mt-0.5 text-xs text-adm-subtle" title={[waktu(a.created_at), a.ip && `IP ${a.ip}`, a.user_agent].filter(Boolean).join(' · ')}>
                      {relatif(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {doc.content_hash && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-adm-line pt-3 text-xs text-adm-muted" title={doc.content_hash}>
          <Fingerprint className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Sidik versi {doc.version}: <code className="truncate font-mono text-adm-fg">{doc.content_hash.slice(0, 16)}…</code>
        </p>
      )}
    </Panel>
  );
}
