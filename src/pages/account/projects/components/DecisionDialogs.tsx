// The client's decision on a document in `menunggu_persetujuan` (pd_my_document_decide, PROJECT-DOCS-SPEC §1.1, §5):
// - SignApproveDialog: approve + sign as Pihak Kedua in one step (MoU, PKS, UAT, BAST, SLA): signer name & title,
//   SignaturePad (draw or typed; "Hapus" of a drawing asks for confirmation first), explicit consent checkbox.
// - RevisionDialog: request a revision with a required note (the document goes back to draft at the company).
// Approving a document without signatures uses the plain ConfirmDialog of the account pages. A failed request shows
// its message in the dialog plus the page's failure toast (notify); success toasts are shown by the page.
import { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Signature } from 'lucide-react';
import { pdMyDocumentDecide } from '../../../../features/project-docs/api';
import { SignaturePad, type SignatureValue } from '../../../../features/project-docs/signature/SignaturePad';
import type { DocDetail, MyDocumentDecideResponse } from '../../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../../lib/api';
import type { ToastTone } from '../../cms/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Field } from '../../components/Field';
import { fieldProps } from '../../components/fieldProps';
import { FormDialog } from './FormDialog';

/** Consent sentence of the e-signature (spec §7 Customer). */
export const SIGN_CONSENT = 'Saya menyetujui isi dokumen ini dan menandatanganinya secara elektronik';

const NOTE_MAX = 2000;

const FAIL_TEXT = 'Terjadi kesalahan. Coba lagi.';

type Errors = Partial<Record<'signer_name' | 'signer_title' | 'signature' | 'consent' | 'note', string>>;

/** Field errors of a 400 response, limited to the fields these dialogs show. */
const serverFieldErrors = (err: unknown): Errors => {
  const fields = err instanceof ApiError ? err.fieldErrors ?? {} : {};
  const out: Errors = {};
  for (const key of ['signer_name', 'signer_title', 'signature', 'note'] as const) if (fields[key]) out[key] = fields[key];
  return out;
};

interface DecisionProps {
  open: boolean;
  doc: DocDetail;
  onClose: () => void;
  onDone: (result: MyDocumentDecideResponse) => void;
  /** a 409 (document no longer waiting for the client): the page reloads and explains */
  onConflict: (message: string) => void;
  /** the page's toast (the dialogs do not render their own <Toast>), e.g. when the request fails */
  notify: (tone: ToastTone, message: string, description?: string) => void;
  /** default signer name when the client record has none (the logged-in account's name) */
  accountName?: string;
}

/** Signer defaults from the document's merge data: a private person signs as themselves, a company through its PIC. */
function signerDefaults(doc: DocDetail, accountName: string) {
  const client = doc.merge.client;
  if (client.type === 'perorangan') return { name: client.name || accountName, title: '' };
  return { name: client.pic_name || accountName, title: client.pic_title || '' };
}

export function SignApproveDialog({ open, doc, onClose, onDone, onConflict, notify, accountName = '' }: DecisionProps) {
  const defaults = signerDefaults(doc, accountName);
  const [name, setName] = useState(defaults.name);
  const [title, setTitle] = useState(defaults.title);
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // "Hapus" of a drawn signature waits for the confirmation dialog; the pad's clear function is kept until then
  const [pendingClear, setPendingClear] = useState<(() => void) | null>(null);

  // Fresh form every time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaults.name);
      setTitle(defaults.title);
      setSignature(null);
      setConsent(false);
      setErrors({});
      setServerError(null);
      setPendingClear(null);
    }
  }

  const signatureRef = useRef<HTMLDivElement>(null);
  // After clearing, the pad's Hapus button is disabled: focus moves to the chosen signing method (not <body>)
  const focusAfterClear = useRef(false);

  useEffect(() => {
    if (pendingClear || !focusAfterClear.current) return;
    focusAfterClear.current = false;
    signatureRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
  }, [pendingClear]);

  const confirmClear = () => {
    pendingClear?.();
    focusAfterClear.current = true;
    setPendingClear(null);
  };

  /** Brings the first invalid field into view (the dialog body scrolls on short screens). */
  const revealFirstError = (found: Errors) => {
    if (found.signer_name) document.getElementById('signer-name')?.focus();
    else if (found.signature) signatureRef.current?.scrollIntoView?.({ block: 'center' });
    else if (found.consent) document.getElementById('sign-consent')?.focus();
  };

  const submit = async () => {
    const found: Errors = {};
    if (!name.trim()) found.signer_name = 'Nama penanda tangan wajib diisi.';
    if (!signature) found.signature = 'Bubuhkan tanda tangan dulu: gambar atau ketik nama Anda.';
    if (!consent) found.consent = 'Centang persetujuan untuk menandatangani.';
    setErrors(found);
    revealFirstError(found);
    if (Object.keys(found).length || !signature) return;
    setBusy(true);
    setServerError(null);
    try {
      const result = await pdMyDocumentDecide({
        id: doc.id,
        decision: 'approved',
        signature: signature.input,
        signer_name: name.trim(),
        signer_title: title.trim(),
        content_hash: doc.content_hash ?? undefined,
      });
      onDone(result);
    } catch (err) {
      notify('danger', 'Gagal menyetujui dokumen.', errorMessage(err, FAIL_TEXT));
      if (err instanceof ApiError && err.status === 409) {
        onConflict(err.message);
        return;
      }
      setErrors(serverFieldErrors(err));
      setServerError(`Gagal menyetujui dokumen: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FormDialog
        open={open}
        title="Setujui & tandatangani"
        description={
          <>
            {doc.title} · <span className="tabular-nums">{doc.number}</span> · versi {doc.version}
          </>
        }
        submitLabel="Setujui & tandatangani"
        submitIcon={<Signature className="h-4 w-4" aria-hidden />}
        busy={busy}
        error={serverError}
        onSubmit={submit}
        onClose={onClose}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="signer-name" label="Nama penanda tangan" error={errors.signer_name}>
            <input
              {...fieldProps('signer-name', errors.signer_name)}
              className="input-site"
              value={name}
              maxLength={255}
              autoComplete="name"
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id="signer-title" label="Jabatan" optional error={errors.signer_title}>
            <input
              {...fieldProps('signer-title', errors.signer_title)}
              className="input-site"
              value={title}
              maxLength={255}
              placeholder="mis. Direktur"
              autoComplete="organization-title"
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
        </div>

        <div ref={signatureRef}>
          <p className="label-site">Tanda tangan</p>
          <SignaturePad
            variant="account"
            defaultName={name}
            disabled={busy}
            error={errors.signature}
            onChange={(value) => {
              setSignature(value);
              if (value && errors.signature) setErrors((prev) => ({ ...prev, signature: undefined }));
            }}
            onClearRequest={(clear) => setPendingClear(() => clear)}
          />
        </div>

        <div>
          <label htmlFor="sign-consent" className="flex cursor-pointer items-start gap-3 rounded-xl bg-alt px-3.5 py-3 text-sm text-fg">
            <input
              id="sign-consent"
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked && errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
              }}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? 'sign-consent-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-primary"
            />
            <span>{SIGN_CONSENT}</span>
          </label>
          {errors.consent && (
            <p id="sign-consent-error" className="error-site pl-[46px]">
              {errors.consent}
            </p>
          )}
        </div>

        <p className="text-xs leading-relaxed text-subtle">
          Tanda tangan elektronik ini dicatat bersama nama, waktu, alamat IP, perangkat, dan sidik dokumen (SHA-256) versi ini.
          Bila isi dokumen berubah, dokumen perlu ditandatangani ulang.
        </p>
      </FormDialog>

      {/* Above the form dialog (Esc / backdrop close only this one); outside FormDialog so its events stay out of the form */}
      <ConfirmDialog
        open={open && pendingClear !== null}
        title="Hapus gambar tanda tangan?"
        description="Tanda tangan yang sudah Anda gambar di kotak ini dihapus, lalu Anda perlu menggambarnya lagi."
        confirmLabel="Ya, hapus"
        cancelLabel="Batal"
        tone="danger"
        onConfirm={confirmClear}
        onClose={() => setPendingClear(null)}
      />
    </>
  );
}

export function RevisionDialog({ open, doc, onClose, onDone, onConflict, notify }: Omit<DecisionProps, 'accountName'>) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNote('');
      setError(undefined);
      setServerError(null);
    }
  }

  const submit = async () => {
    const text = note.trim();
    if (!text) {
      setError('Catatan revisi wajib diisi.');
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      onDone(await pdMyDocumentDecide({ id: doc.id, decision: 'rejected', note: text, content_hash: doc.content_hash ?? undefined }));
    } catch (err) {
      notify('danger', 'Gagal mengirim permintaan revisi.', errorMessage(err, FAIL_TEXT));
      if (err instanceof ApiError && err.status === 409) {
        onConflict(err.message);
        return;
      }
      setError(serverFieldErrors(err).note);
      setServerError(`Gagal mengirim permintaan revisi: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      title="Minta revisi"
      description="Jelaskan bagian yang perlu diubah. Tim kami memperbaiki dokumen, lalu mengirimkannya lagi untuk Anda tinjau."
      submitLabel="Kirim permintaan revisi"
      submitIcon={<MessageSquareText className="h-4 w-4" aria-hidden />}
      busy={busy}
      error={serverError}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field
        id="revision-note"
        label="Catatan revisi"
        error={error}
        help="mis. Mohon ubah jadwal serah terima menjadi akhir November."
        aside={
          <span className="text-xs tabular-nums text-subtle">
            {note.length}/{NOTE_MAX}
          </span>
        }
      >
        <textarea
          {...fieldProps('revision-note', error, true)}
          className="input-site"
          rows={5}
          value={note}
          maxLength={NOTE_MAX}
          disabled={busy}
          onChange={(e) => {
            setNote(e.target.value);
            if (error && e.target.value.trim()) setError(undefined);
          }}
        />
      </Field>
    </FormDialog>
  );
}
