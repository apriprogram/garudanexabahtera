// Panel invoice di editor: total, status pembayaran, daftar pembayaran (bukti, kuitansi) dan hapus pembayaran
// (pd_payment_delete, admin: jumlah dibalik, kuitansinya tetap di riwayat dengan catatan "Dibatalkan").
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Paperclip, Trash2, Wallet } from 'lucide-react';
import { Button, ConfirmDialog, IconButton, Panel, PanelHeader, cn } from '../../../../components/admin/ui';
import { downloadPdFile, pdPaymentDelete } from '../../../../features/project-docs/api';
import { PAYMENT_METHOD_LABEL, type InvoiceDetail, type Payment } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { rupiah, tanggal } from '../shared/format';
import { PaymentBadge } from '../shared/ui';

export function PaymentsPanel({
  invoice,
  payments,
  projectId,
  isAdmin,
  onRecord,
  onChanged,
  notify,
}: {
  invoice: InvoiceDetail;
  payments: Payment[];
  projectId: number;
  isAdmin: boolean;
  /** opens the payment form; undefined when the invoice cannot take payments */
  onRecord?: () => void;
  onChanged: () => void;
  notify: (tone: 'success' | 'error', message: string) => void;
}) {
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);

  const openProof = async (p: Payment) => {
    if (!p.proof_url) return;
    // Tab dibuka lebih dulu (sinkron dengan klik) agar tidak diblokir; isinya diisi setelah file terunduh
    const tab = window.open('', '_blank');
    setOpening(p.id);
    try {
      const url = await downloadPdFile(p.proof_url);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      notify('error', `Gagal membuka bukti: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setOpening(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await pdPaymentDelete({ id: toDelete.id });
      notify('success', 'Pembayaran berhasil dihapus.');
      setToDelete(null);
      onChanged();
    } catch (err) {
      notify('error', `Gagal menghapus pembayaran: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setDeleting(false);
    }
  };

  const line = (label: string, value: string, strong = false) => (
    <div className={cn('flex items-center justify-between gap-3 text-[13px]', strong ? 'font-semibold text-adm-fg' : 'text-adm-muted')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <Panel>
      <PanelHeader
        icon={Wallet}
        title="Pembayaran"
        action={<PaymentBadge status={invoice.payment_status} overdue={invoice.overdue} size="sm" />}
      />
      <div className="space-y-1.5 rounded-2xl bg-adm-ghost p-3">
        {line('Jumlah tagihan', rupiah(invoice.amount_due), true)}
        {line('Sudah dibayar', rupiah(invoice.amount_paid))}
        {line('Sisa', rupiah(invoice.remaining), true)}
        {line('Jatuh tempo', tanggal(invoice.due_date))}
      </div>
      {onRecord && isAdmin && (
        <Button icon={<Banknote />} size="sm" fullWidth className="mt-3" onClick={onRecord}>
          Catat pembayaran
        </Button>
      )}

      {payments.length > 0 ? (
        <ul className="mt-4 divide-y divide-adm-line">
          {payments.map((p) => (
            <li key={p.id} className="flex items-start gap-2 py-2.5">
              <div className="min-w-0 flex-1 text-xs text-adm-muted">
                <p className="text-[13px] font-semibold tabular-nums text-adm-fg">{rupiah(p.amount)}</p>
                <p>
                  {tanggal(p.paid_at)} · {PAYMENT_METHOD_LABEL[p.method]}
                  {p.reference ? ` · ${p.reference}` : ''}
                </p>
                {p.receipt_document_id && p.receipt_number && (
                  <Link to={`/admin/proyek/${projectId}/dokumen/${p.receipt_document_id}`} className="font-mono text-adm-link hover:underline">
                    {p.receipt_number}
                  </Link>
                )}
                {p.note && <p className="mt-0.5 italic">{p.note}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                {p.proof_url && <IconButton icon={<Paperclip />} label="Lihat bukti pembayaran" size="sm" loading={opening === p.id} onClick={() => openProof(p)} />}
                {isAdmin && <IconButton icon={<Trash2 />} label="Hapus pembayaran" size="sm" variant="danger-ghost" onClick={() => setToDelete(p)} />}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-adm-muted">{invoice.doc_status === 'draft' ? 'Terbitkan invoice dulu sebelum mencatat pembayaran.' : 'Belum ada pembayaran.'}</p>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        onConfirm={remove}
        loading={deleting}
        tone="danger"
        title="Hapus pembayaran?"
        description={`Pembayaran ${toDelete ? rupiah(toDelete.amount) : ''} dibatalkan dan sisa tagihan bertambah lagi. Kuitansinya tetap tersimpan dengan tanda "Dibatalkan".`}
        confirmText="Ya, hapus"
      />
    </Panel>
  );
}
