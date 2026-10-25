// Langkah kedua daftar dengan Google (/daftar dan /masuk, email Google belum terdaftar): Google tidak memberi nomor
// WhatsApp, padahal tim memakainya untuk konfirmasi pesanan, jadi nomor diminta di sini sebelum akun dibuat. Nama terisi
// dari akun Google dan boleh diubah. Persetujuan dokumen legal sama dengan form daftar biasa.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Mail, Phone, User } from 'lucide-react';
import { LEGAL_LABELS, LEGAL_PATHS } from '../../lib/legal';
import {
  checkPhone,
  checkText,
  focusFirstError,
  hasErrors,
  normalizePhone,
  type FieldErrors,
} from '../../pages/account/components/validation';
import { AuthLayout } from './AuthLayout';
import { AuthField } from './AuthField';
import { AuthAlert, AuthSubmit } from './AuthFeedback';
import type { GoogleSignup, GoogleSignupField, useGoogleAuth } from './useGoogleAuth';

const FIELD_ORDER: GoogleSignupField[] = ['name', 'phone'];

/** Seluruh halaman langkah kedua (judul, pemberitahuan gagal, form), menggantikan isi /masuk atau /daftar. */
export function GoogleSignupStep({ google, signup }: { google: ReturnType<typeof useGoogleAuth>; signup: GoogleSignup }) {
  return (
    <AuthLayout title="Satu langkah lagi" subtitle="Lengkapi nomor WhatsApp untuk menyelesaikan pendaftaran dengan Google.">
      <AnimatePresence initial={false}>
        {google.error && (
          <AuthAlert key={google.error} tone="danger" onClose={google.clearError}>
            {google.error}
          </AuthAlert>
        )}
      </AnimatePresence>
      <GoogleSignupForm
        signup={signup}
        busy={google.busy}
        serverErrors={google.fieldErrors}
        onSubmit={google.completeSignup}
        onCancel={google.cancelSignup}
      />
    </AuthLayout>
  );
}

interface GoogleSignupFormProps {
  signup: GoogleSignup;
  busy: boolean;
  /** Pesan per kolom dari server (VALIDATION) */
  serverErrors: FieldErrors<GoogleSignupField>;
  onSubmit: (name: string, phone: string) => void;
  onCancel: () => void;
}

function GoogleSignupForm({ signup, busy, serverErrors, onSubmit, onCancel }: GoogleSignupFormProps) {
  const [values, setValues] = useState({ name: signup.name, phone: '' });
  const [errors, setErrors] = useState<FieldErrors<GoogleSignupField>>({});
  const [seenServerErrors, setSeenServerErrors] = useState(serverErrors);
  // Pesan baru dari server menggantikan pesan lokal (pola "state dari props" React, tanpa effect)
  if (serverErrors !== seenServerErrors) {
    setSeenServerErrors(serverErrors);
    setErrors(serverErrors);
  }

  const check = (key: GoogleSignupField) =>
    key === 'name' ? checkText(values.name, 'Nama lengkap', { min: 2, max: 100 }) : checkPhone(values.phone, 'Nomor WhatsApp');

  const field = (key: GoogleSignupField) => ({
    id: key,
    value: values[key],
    error: errors[key],
    disabled: busy,
    onChange: (e: { target: { value: string } }) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    onBlur: () => {
      if (values[key].trim()) setErrors((prev) => ({ ...prev, [key]: check(key) }));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found: FieldErrors<GoogleSignupField> = { name: check('name'), phone: check('phone') };
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
    }
    onSubmit(values.name.trim(), normalizePhone(values.phone));
  };

  return (
    <form onSubmit={submit} noValidate aria-busy={busy || undefined} className="space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-alt px-4 py-3 ring-1 ring-inset ring-line">
        <Mail className="h-[18px] w-[18px] shrink-0 text-subtle" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Akun Google</p>
          <p className="truncate text-sm font-medium text-fg">{signup.email}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="relative shrink-0 rounded-md text-[13px] font-semibold text-primary underline-offset-4 after:absolute after:-inset-2 hover:text-primary-hover hover:underline disabled:opacity-60"
        >
          Batal
        </button>
      </div>

      <AuthField {...field('name')} label="Nama lengkap" icon={User} type="text" autoComplete="name" enterKeyHint="next" />

      <AuthField
        {...field('phone')}
        label="Nomor WhatsApp"
        icon={Phone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="go"
        placeholder="mis. 0812-3456-7890"
        help="Dipakai tim kami untuk konfirmasi pesanan."
        autoFocus
      />

      <div>
        <AuthSubmit loading={busy} loadingText="Membuat akun...">
          Selesai Daftar
        </AuthSubmit>
        <p className="mt-3 text-center text-xs leading-relaxed text-subtle">
          Dengan mendaftar, Anda menyetujui{' '}
          <Link to={LEGAL_PATHS.terms} target="_blank" rel="noopener" className="link-site">
            {LEGAL_LABELS.terms}
            <span className="sr-only"> (tab baru)</span>
          </Link>{' '}
          dan{' '}
          <Link to={LEGAL_PATHS.privacy} target="_blank" rel="noopener" className="link-site">
            {LEGAL_LABELS.privacy}
            <span className="sr-only"> (tab baru)</span>
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
