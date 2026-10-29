// Modal dengan satu alasan wajib (batalkan invoice, ajukan perubahan dokumen). onSubmit melempar error → tampil di modal
// dan sebagai toast halaman (`errorTitle` + pesan server lewat `notify`).
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Field, Modal, ModalBody, ModalFooter, Notice, Textarea } from '../../../../components/admin/ui';
import { errorMessage } from '../../../../lib/api';
import { errorDetail, type Notify } from './hooks';

export function ReasonModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  label,
  placeholder,
  confirmText,
  tone = 'default',
  minLength = 1,
  maxLength = 500,
  icon,
  children,
  notify,
  errorTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  /** toast halaman saat onSubmit gagal */
  notify: Notify;
  /** judul toast galat, mis. "Gagal membatalkan invoice." */
  errorTitle: string;
  title: ReactNode;
  description?: ReactNode;
  label: string;
  placeholder?: string;
  confirmText: string;
  tone?: 'default' | 'danger';
  minLength?: number;
  maxLength?: number;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason('');
      setError(null);
      setServerError(null);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = reason.trim();
    if (text.length < minLength) {
      setError(minLength > 1 ? `${label} minimal ${minLength} karakter.` : `${label} wajib diisi.`);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      await onSubmit(text);
    } catch (err) {
      setServerError(errorMessage(err, 'kesalahan tidak diketahui'));
      notify('error', errorTitle, errorDetail(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={saving ? () => undefined : onClose} title={title} description={description} icon={icon} size="sm" customBody>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          {children}
          <Field label={label} htmlFor="reason-text" required error={error} hint={`${reason.trim().length}/${maxLength} karakter`}>
            <Textarea
              id="reason-text"
              rows={4}
              value={reason}
              maxLength={maxLength}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              invalid={!!error}
              placeholder={placeholder}
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} loading={saving}>
            {confirmText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
