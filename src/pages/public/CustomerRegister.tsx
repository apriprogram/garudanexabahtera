// Pendaftaran pembeli (/daftar): action `customer_register`, akun langsung aktif dan langsung masuk (setSession),
// lalu ke ?next (path relatif saja) atau /akun. Tampilan: kerangka auth terang bersama (src/components/auth).
// Tanpa "Ulangi kata sandi": field kata sandi punya tombol tampilkan untuk memeriksa salah ketik, dan form jadi
// cukup pendek agar tombol daftar terlihat di layar pertama. Lihat docs/platform/SPEC.md §2 & §6.
// Opsi tambahan "Daftar dengan Google" di bawah tombol daftar (docs/platform/GOOGLE-LOGIN.md): email yang sudah
// terdaftar langsung masuk (Gmail/Workspace ditautkan), email baru lanjut ke langkah kedua (nomor WhatsApp).
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import { getRole, setSession } from '../../lib/auth';
import { LEGAL_LABELS, LEGAL_PATHS } from '../../lib/legal';
import { AuthLayout, AuthSwitch } from '../../components/auth/AuthLayout';
import { AuthTabs } from '../../components/auth/AuthTabs';
import { AuthField } from '../../components/auth/AuthField';
import { AuthAlert, AuthSubmit } from '../../components/auth/AuthFeedback';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { GoogleSignupStep } from '../../components/auth/GoogleSignupForm';
import { useGoogleAuth } from '../../components/auth/useGoogleAuth';
import {
  pathAfterLogin,
  useAuthTitle,
  type AuthNavState,
  type SessionResponse,
} from '../../components/auth/authForm';
import {
  checkEmail,
  checkPassword,
  checkPhone,
  checkText,
  focusFirstError,
  hasErrors,
  normalizePhone,
  type FieldErrors,
} from '../account/components/validation';

type RegisterField = 'name' | 'email' | 'phone' | 'password';
const FIELD_ORDER: RegisterField[] = ['name', 'email', 'phone', 'password'];
/** Field yang langsung dicek saat ditinggalkan (bila sudah diisi) */
const CHECK_ON_BLUR: RegisterField[] = ['name', 'email', 'phone'];

export default function CustomerRegister() {
  useAuthTitle('Daftar');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = params.get('next');
  const nextPath = pathAfterLogin('customer', next);
  const fromOrder = nextPath.startsWith('/pesan/');
  const navState = (location.state ?? null) as AuthNavState | null;

  const [values, setValues] = useState<Record<RegisterField, string>>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const google = useGoogleAuth({ next });

  // Muat halaman masuk lebih dulu agar pindah tab tidak menampilkan layar memuat
  useEffect(() => {
    void import('./CustomerLogin');
  }, []);

  const role = getRole();
  if (role && !submitting && !google.busy) return <Navigate to={pathAfterLogin(role, next)} replace />;

  const check = (key: RegisterField): string | undefined => {
    switch (key) {
      case 'name':
        return checkText(values.name, 'Nama lengkap', { min: 2, max: 100 });
      case 'email':
        return checkEmail(values.email);
      case 'phone':
        return checkPhone(values.phone, 'Nomor WhatsApp');
      case 'password':
        return checkPassword(values.password);
    }
  };

  const field = (key: RegisterField) => ({
    id: key,
    value: values[key],
    error: errors[key],
    disabled: submitting,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
      if (key === 'email') setEmailTaken(false);
    },
    onBlur: CHECK_ON_BLUR.includes(key)
      ? () => {
          if (values[key].trim()) setErrors((prev) => ({ ...prev, [key]: check(key) }));
        }
      : undefined,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setEmailTaken(false);
    const found: FieldErrors<RegisterField> = {};
    for (const key of FIELD_ORDER) found[key] = check(key);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<SessionResponse>('customer_register', {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: normalizePhone(values.phone),
        password: values.password,
      });
      // Akun langsung aktif: simpan sesi (auto-login) lalu lanjut ke tujuan
      setSession(res.token, res.user);
      navigate(pathAfterLogin(res.user.role, next), { replace: true });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.fieldErrors) {
        const serverErrors: FieldErrors<RegisterField> = {};
        for (const key of FIELD_ORDER) {
          if (err.fieldErrors[key]) serverErrors[key] = err.fieldErrors[key];
        }
        if (hasErrors(serverErrors)) {
          setErrors(serverErrors);
          setEmailTaken(err.code === 'EMAIL_TAKEN');
          focusFirstError(FIELD_ORDER, serverErrors);
          return;
        }
      }
      setFormError(errorMessage(err, 'Gagal mendaftar. Silakan coba lagi.'));
    }
  };

  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(nextPath)}` : path);

  if (google.signup) return <GoogleSignupStep google={google} signup={google.signup} />;

  return (
    <AuthLayout
      title="Buat akun pembeli"
      subtitle={
        fromOrder
          ? 'Daftar gratis untuk melanjutkan pemesanan template Anda.'
          : 'Daftar gratis untuk memesan template dan mengelola situs Anda.'
      }
      entrance={navState?.authTab ? 'tab' : 'page'}
      tabs={
        <AuthTabs
          label="Masuk atau daftar akun pembeli"
          items={[
            { key: 'login', label: 'Masuk', to: withNext('/masuk') },
            { key: 'register', label: 'Daftar', to: withNext('/daftar') },
          ]}
          active="register"
          from={navState?.authTab}
        />
      }
      footer={
        <AuthSwitch
          text="Sudah punya akun?"
          to={withNext('/masuk')}
          state={{ authTab: 'register' } satisfies AuthNavState}
          replace
        >
          Masuk di sini
        </AuthSwitch>
      }
    >
      <AnimatePresence initial={false}>
        {formError && (
          <AuthAlert key={formError} tone="danger" onClose={() => setFormError(null)}>
            {formError}
          </AuthAlert>
        )}
        {google.error && (
          <AuthAlert key={`google:${google.error}`} tone="danger" onClose={google.clearError}>
            {google.error}
            {google.passwordEmail && (
              <>
                {' '}
                <Link
                  to={withNext('/masuk')}
                  state={{ authTab: 'register', email: google.passwordEmail } satisfies AuthNavState}
                  replace
                  className="font-semibold underline underline-offset-4"
                >
                  Masuk dengan email ini
                </Link>
              </>
            )}
          </AuthAlert>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} noValidate aria-busy={submitting || undefined} className="space-y-4 sm:space-y-5">
        <AuthField
          {...field('name')}
          label="Nama lengkap"
          icon={User}
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          placeholder="mis. Budi Santoso"
        />

        <div>
          <AuthField
            {...field('email')}
            label="Email"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="nama@email.com"
          />
          {emailTaken && (
            <p className="mt-1.5 text-xs text-muted">
              Sudah pernah mendaftar?{' '}
              <Link
                to={withNext('/masuk')}
                state={{ authTab: 'register', email: values.email.trim() } satisfies AuthNavState}
                replace
                className="font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Masuk dengan email ini
              </Link>
            </p>
          )}
        </div>

        <AuthField
          {...field('phone')}
          label="Nomor WhatsApp"
          icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          placeholder="mis. 0812-3456-7890"
          help="Dipakai tim kami untuk konfirmasi pesanan."
        />

        <AuthField
          {...field('password')}
          password
          label="Kata sandi"
          icon={Lock}
          autoComplete="new-password"
          enterKeyHint="go"
          placeholder="Buat kata sandi"
          help="Minimal 8 karakter."
        />

        <div>
          <AuthSubmit loading={submitting} loadingText="Mendaftarkan akun...">
            Daftar Akun
          </AuthSubmit>
          <GoogleAuthButton text="signup_with" onCredential={google.onCredential} disabled={submitting || google.busy} />
          {/* Persetujuan dokumen legal (UU PDP: form ini mengumpulkan nama, email, dan nomor HP). Tab baru agar isian
              form tidak hilang. */}
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
    </AuthLayout>
  );
}
