// Catat pembayaran (pd_payment_record, admin): amount ≤ remaining, date, method, reference, optional proof
// (jpg/png/pdf ≤ 5 MB as data URL) and note. The backend issues the Kuitansi (receipt document) in the same step.
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Paperclip, Wallet, X } from 'lucide-react';
import { Button, ConfirmDialog, Field, IconButton, Input, Modal, ModalBody, ModalFooter, Notice, Select, Textarea } from '../../../../components/admin/ui';
import { pdPaymentRecord } from '../../../../features/project-docs/api';
import { PAYMENT_METHOD_LABEL, type DocContent, type PaymentMethod, type PaymentRecordResponse } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { rupiah, todayIso } from '../shared/format';
import { errorDetail, fieldErrorsOf, type Notify } from '../shared/hooks';
import { validatePayment, type Errors } from '../shared/validation';

const PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const PROOF_MAX = 5 * 1024 * 1024;
const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

/** Invoice being paid. */
export interface PayableInvoice {
  id: number;
  number: string;
  amount_due: number;
  remaining: number;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

export function PaymentFormModal({
  open,
  onClose,
  invoice,
  receiptContent,
  onSaved,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  invoice: PayableInvoice | null;
  /** template content of the Kuitansi issued with this payment */
  receiptContent: DocContent;
  onSaved: (result: PaymentRecordResponse) => void;
  /** toast halaman (galat simpan) */
  notify: Notify;
}) {
  const [amount, setAmount] = useState(Number.NaN);
  const [paidAt, setPaidAt] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<{ name: string; dataUrl: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmProof, setConfirmProof] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [openedFor, setOpenedFor] = useState<number | null>(null);
  const openKey = open && invoice ? invoice.id : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open && invoice) {
      setAmount(invoice.remaining);
      setPaidAt(todayIso());
      setMethod('transfer');
      setReference('');
      setNote('');
      setProof(null);
      setErrors({});
      setServerError(null);
    }
  }

  const pickProof = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PROOF_TYPES.includes(file.type)) {
      setErrors((x) => ({ ...x, proof: 'Bukti harus JPG, PNG, atau PDF.' }));
      return;
    }
    if (file.size > PROOF_MAX) {
      setErrors((x) => ({ ...x, proof: 'Ukuran bukti maks. 5 MB.' }));
      return;
    }
    try {
      setProof({ name: file.name, dataUrl: await readDataUrl(file) });
      setErrors((x) => ({ ...x, proof: '' }));
    } catch (err) {
      setErrors((x) => ({ ...x, proof: errorMessage(err) }));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const found = validatePayment({ amount, paid_at: paidAt, reference, note }, invoice.remaining);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await pdPaymentRecord({
        invoice_id: invoice.id,
        amount: Math.round(amount),
        paid_at: paidAt,
        method,
        reference: reference.trim() || null,
        proof: proof?.dataUrl ?? null,
        note: note.trim() || null,
        receipt_content: receiptContent,
      });
      onSaved(res);
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setServerError(`Gagal mencatat pembayaran: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      notify('error', 'Gagal mencatat pembayaran.', errorDetail(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Catat pembayaran"
      description={invoice ? `Invoice ${invoice.number} · sisa tagihan ${rupiah(invoice.remaining)}` : undefined}
      icon={<Wallet />}
      size="md"
      customBody
    >
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jumlah diterima" htmlFor="pay-amount" required error={errors.amount} hint={Number.isFinite(amount) ? rupiah(amount) : undefined}>
              <Input
                id="pay-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={invoice?.remaining}
                step={1}
                value={Number.isFinite(amount) ? String(amount) : ''}
                onChange={(e) => setAmount(e.target.value.trim() === '' ? Number.NaN : Number(e.target.value))}
                invalid={!!errors.amount}
                className="tabular-nums"
              />
            </Field>
            <Field label="Tanggal pembayaran" htmlFor="pay-date" required error={errors.paid_at}>
              <Input id="pay-date" type="date" value={paidAt} max={todayIso()} onChange={(e) => setPaidAt(e.target.value)} invalid={!!errors.paid_at} />
            </Field>
            <Field label="Metode" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Referensi" htmlFor="pay-ref" optional error={errors.reference}>
              <Input id="pay-ref" value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} placeholder="mis. nomor transaksi bank" />
            </Field>
          </div>
          <Field label="Bukti pembayaran" optional="(JPG, PNG, atau PDF, maks. 5 MB)" error={errors.proof}>
            <input ref={fileRef} type="file" accept={PROOF_TYPES.join(',')} className="sr-only" onChange={pickProof} tabIndex={-1} aria-hidden />
            {proof ? (
              <div className="flex items-center gap-2 rounded-xl bg-adm-ghost px-3 py-2">
                <Paperclip className="h-4 w-4 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] text-adm-fg">{proof.name}</span>
                <IconButton icon={<X />} label="Hapus bukti" size="xs" onClick={() => setConfirmProof(true)} />
              </div>
            ) : (
              <Button variant="secondary" size="sm" icon={<Paperclip />} onClick={() => fileRef.current?.click()}>
                Unggah bukti
              </Button>
            )}
          </Field>
          <Field label="Catatan" htmlFor="pay-note" optional error={errors.note}>
            <Textarea id="pay-note" rows={2} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} className="min-h-[72px]" placeholder="Tulis catatan internal..." />
          </Field>
          <p className="rounded-xl bg-adm-cobalt-soft px-3 py-2.5 text-xs leading-relaxed text-adm-cobalt-fg">
            Kuitansi terbit otomatis setelah pembayaran dicatat, dan klien mendapat notifikasi.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving} disabled={!invoice}>
            Catat pembayaran
          </Button>
        </ModalFooter>
      </form>
      <ConfirmDialog
        open={confirmProof}
        onClose={() => setConfirmProof(false)}
        onConfirm={() => {
          setProof(null);
          setConfirmProof(false);
        }}
        tone="danger"
        title={`Hapus bukti "${proof?.name ?? ''}"?`}
        description="File ini batal dilampirkan; unggah bukti lain bila perlu."
        confirmText="Ya, hapus"
      />
    </Modal>
  );
}
