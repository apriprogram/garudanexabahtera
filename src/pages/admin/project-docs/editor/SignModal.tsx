// Tanda tangan Pihak Pertama (pd_document_sign, admin): gambar di kanvas atau ketik nama, nama & jabatan penanda
// tangan (bawaan dari Pengaturan dokumen), dan persetujuan eksplisit sebelum menandatangani versi ini.
import { useRef, useState, type FormEvent } from 'react';
import { PenLine } from 'lucide-react';
import { Button, Field, Input, Modal, ModalBody, ModalFooter, Notice, Segmented, checkboxClass } from '../../../../components/admin/ui';
import { pdDocumentSign } from '../../../../features/project-docs/api';
import type { DocumentSignResponse, SignatureMethod } from '../../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../../lib/api';
import { errorDetail, fieldErrorsOf, type Notify } from '../shared/hooks';
import type { Errors } from '../shared/validation';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

export function SignModal({
  open,
  onClose,
  documentId,
  documentLabel,
  version,
  contentHash,
  companyName,
  defaultName,
  defaultTitle,
  onSigned,
  onConflict,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  documentId: number;
  /** e.g. "PKS 007/PKS/GNB/X/2026" */
  documentLabel: string;
  version: number;
  /** content_hash of the frozen version on screen: the server refuses (409) when the document changed since */
  contentHash: string | null;
  companyName: string;
  defaultName: string;
  defaultTitle: string;
  onSigned: (result: DocumentSignResponse) => void;
  /** 409: the document changed or was already signed meanwhile; the editor reloads it */
  onConflict: (message: string) => void;
  /** toast halaman editor (galat lain selain 409) */
  notify: Notify;
}) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [method, setMethod] = useState<SignatureMethod>('draw');
  const [drawn, setDrawn] = useState(false);
  const [typed, setTyped] = useState('');
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState(defaultTitle);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMethod('draw');
      setDrawn(false);
      setTyped(defaultName);
      setName(defaultName);
      setTitle(defaultTitle);
      setConsent(false);
      setErrors({});
      setServerError(null);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.signer_name = 'Nama penanda tangan wajib diisi.';
    const dataUrl = method === 'draw' ? padRef.current?.toDataUrl() : null;
    if (method === 'draw' && !dataUrl) found.signature = 'Gambar tanda tangan dulu.';
    if (method === 'type' && !typed.trim()) found.signature = 'Ketik nama untuk tanda tangan.';
    if (!consent) found.consent = 'Centang persetujuan untuk menandatangani.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await pdDocumentSign({
        id: documentId,
        signature: method === 'draw' ? { method, data_url: dataUrl ?? undefined } : { method, typed_name: typed.trim() },
        signer_name: name.trim(),
        signer_title: title.trim(),
        content_hash: contentHash ?? undefined,
      });
      onSigned(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onConflict(err.message);
        return;
      }
      setErrors(fieldErrorsOf(err));
      setServerError(`Gagal menandatangani: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      notify('error', 'Gagal menandatangani dokumen.', errorDetail(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Tandatangani sebagai Pihak Pertama"
      description={`${documentLabel} · versi ${version}`}
      icon={<PenLine />}
      size="md"
      customBody
    >
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <Segmented<SignatureMethod>
            ariaLabel="Cara tanda tangan"
            value={method}
            onChange={setMethod}
            items={[
              { value: 'draw', label: 'Gambar' },
              { value: 'type', label: 'Ketik nama' },
            ]}
          />
          {method === 'draw' ? (
            <Field label="Tanda tangan" error={errors.signature}>
              <SignaturePad ref={padRef} onChange={(empty) => setDrawn(!empty)} />
            </Field>
          ) : (
            <Field label="Nama untuk tanda tangan" htmlFor="sign-typed" error={errors.signature} hint="Server membuat gambar tanda tangan dari nama ini.">
              <Input id="sign-typed" value={typed} maxLength={100} onChange={(e) => setTyped(e.target.value)} invalid={!!errors.signature} />
              <div className="mt-3 flex h-24 items-center justify-center rounded-2xl bg-white px-4 ring-1 ring-inset ring-adm-line-strong" aria-hidden>
                <span className="truncate font-serif text-3xl italic text-fg">{typed.trim() || 'Nama penanda tangan'}</span>
              </div>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama penanda tangan" htmlFor="sign-name" required error={errors.signer_name}>
              <Input id="sign-name" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} invalid={!!errors.signer_name} />
            </Field>
            <Field label="Jabatan" htmlFor="sign-title" optional error={errors.signer_title}>
              <Input id="sign-title" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Direktur" />
            </Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-adm-ghost px-3 py-3 text-[13px] leading-relaxed text-adm-fg">
            <input type="checkbox" className={`${checkboxClass} mt-0.5`} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Saya menyetujui isi dokumen ini dan menandatanganinya secara elektronik atas nama <strong>{companyName || 'perusahaan'}</strong>.
            </span>
          </label>
          {errors.consent && <p className="-mt-2 text-xs text-adm-danger-fg">{errors.consent}</p>}
          <p className="text-xs leading-relaxed text-adm-muted">
            Tanda tangan tercatat bersama waktu, alamat IP, perangkat, dan sidik dokumen (SHA-256) versi ini. Perubahan isi setelahnya membutuhkan tanda tangan ulang.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" icon={<PenLine />} loading={saving} disabled={method === 'draw' && !drawn}>
            Tandatangani
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
