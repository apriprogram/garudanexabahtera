// Halaman masuk pembeli (/masuk). Satu action `login` untuk semua peran: customer → ?next (path relatif saja) atau
// /akun, staf → /admin. Tampilan: kerangka auth terang bersama (src/components/auth). Lihat docs/platform/SPEC.md §2.
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Lock, Mail, MessageCircle } from 'lucide-react';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import { getRole, setSession } from '../../lib/auth';
import { AuthLayout, AuthSwitch } from '../../components/auth/AuthLayout';
import { AuthTabs } from '../../components/auth/AuthTabs';
import { AuthField, AuthTextButton } from '../../components/auth/AuthField';
import { AuthAlert, AuthSubmit } from '../../components/auth/AuthFeedback';
import {
  pathAfterLogin,
  useAuthTitle,
  type AuthNavState,
  type SessionResponse,
} from '../../components/auth/authForm';
import { checkEmail, focusFirstError, hasErrors, type FieldErrors } from '../account/components/validation';

type LoginField = 'email' | 'password';
const FIELD_ORDER: LoginField[] = ['email', 'password'];

export default function CustomerLogin() {
  useAuthTitle('Masuk');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = params.get('next');
  const nextPath = pathAfterLogin('customer', next);
  const fromOrder = nextPath.startsWith('/pesan/');
  const navState = (location.state ?? null) as AuthNavState | null;

  const [email, setEmail] = useState(() => navState?.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(params.get('expired') === '1');
  const [forgotOpen, setForgotOpen] = useState(false);

  // Muat halaman daftar lebih dulu agar pindah tab tidak menampilkan layar memuat
  useEffect(() => {
    void import('./CustomerRegister');
  }, []);

  // Sudah masuk: langsung ke tujuan
  const role = getRole();
  if (role && !submitting) return <Navigate to={pathAfterLogin(role, next)} replace />;

  const validate = (): FieldErrors<LoginField> => ({
    email: checkEmail(email),
    password: password ? undefined : 'Kata sandi wajib diisi.',
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setExpired(false);
    const found = validate();
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<SessionResponse>('login', { email: email.trim(), password });
      setSession(res.token, res.user);
      navigate(pathAfterLogin(res.user.role, next), { replace: true });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.status === 401) {
        setFormError('Email atau kata sandi salah. Periksa lagi lalu coba masuk kembali.');
      } else {
        setFormError(errorMessage(err, 'Gagal masuk. Silakan coba lagi.'));
      }
    }
  };

  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(nextPath)}` : path);

  return (
    <AuthLayout
      title="Selamat datang kembali"
      subtitle={
        fromOrder
          ? 'Masuk untuk melanjutkan pemesanan template Anda.'
          : 'Masuk untuk memantau pesanan, membayar tagihan, dan mengelola situs Anda.'
      }
      entrance={navState?.authTab ? 'tab' : 'page'}
      tabs={
        <AuthTabs
          label="Masuk atau daftar akun pembeli"
          items={[
            { key: 'login', label: 'Masuk', to: withNext('/masuk') },
            { key: 'register', label: 'Daftar', to: withNext('/daftar') },
          ]}
          active="login"
          from={navState?.authTab}
        />
      }
      footer={
        <AuthSwitch
          text="Belum punya akun?"
          to={withNext('/daftar')}
          state={{ authTab: 'login' } satisfies AuthNavState}
          replace
        >
          Daftar sekarang
        </AuthSwitch>
      }
    >
      <AnimatePresence initial={false}>
        {expired && (
          <AuthAlert key="expired" tone="warning" onClose={() => setExpired(false)}>
            Sesi Anda telah berakhir. Silakan masuk kembali.
          </AuthAlert>
        )}
        {formError && (
          <AuthAlert key={formError} tone="danger" onClose={() => setFormError(null)}>
            {formError}
          </AuthAlert>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} noValidate aria-busy={submitting || undefined} className="space-y-4 sm:space-y-5">
        <AuthField
          id="email"
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
          value={email}
          error={errors.email}
          disabled={submitting}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          onBlur={() => {
            if (email.trim()) setErrors((prev) => ({ ...prev, email: checkEmail(email) }));
          }}
        />

        <div>
          <AuthField
            id="password"
            password
            label="Kata sandi"
            icon={Lock}
            autoComplete="current-password"
            enterKeyHint="go"
            placeholder="Masukkan kata sandi"
            value={password}
            error={errors.password}
            disabled={submitting}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aside={
              <AuthTextButton onClick={() => setForgotOpen((v) => !v)} expanded={forgotOpen} controls="forgot-hint">
                Lupa kata sandi?
              </AuthTextButton>
            }
          />
          <AnimatePresence initial={false}>
            {forgotOpen && (
              <AuthAlert key="forgot" id="forgot-hint" tone="info" spacing="top" onClose={() => setForgotOpen(false)}>
                <ForgotPasswordHelp email={email} />
              </AuthAlert>
            )}
          </AnimatePresence>
        </div>

        <AuthSubmit loading={submitting}>Masuk</AuthSubmit>
      </form>
    </AuthLayout>
  );
}

/**
 * Bantuan lupa kata sandi. Belum ada reset mandiri lewat email (butuh backend), jadi pembeli diarahkan ke WhatsApp
 * tim (nomor dari pengaturan website) dengan pesan berisi email yang sudah diketik. Pengaturan baru dimuat saat kotak
 * ini dibuka, bukan di setiap kunjungan halaman masuk.
 */
function ForgotPasswordHelp({ email }: { email: string }) {
  const { settings } = useSiteSettings();
  const message = `Halo Admin, saya lupa kata sandi akun Garuda Nexa (email: ${email.trim() || '-'}). Mohon bantu atur ulang.`;
  return (
    <>
      <p>
        Tim kami bantu mengatur ulang kata sandi Anda lewat WhatsApp.{' '}
        {email.trim() ? 'Pesannya sudah berisi email yang Anda ketik.' : 'Sebutkan email akun Anda di pesan.'}
      </p>
      <a
        href={whatsappUrl(getWhatsappNumber(settings), message)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm mt-3"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Hubungi via WhatsApp
        <span className="sr-only">(tab baru)</span>
      </a>
    </>
  );
}
