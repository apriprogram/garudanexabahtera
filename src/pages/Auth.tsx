// Login staf (/login, /auth): satu action `login` untuk semua peran. Staf → ?next di /admin atau /admin,
// pembeli (customer) → /akun. Tab "Daftar staf" (?type=register) memakai action lama `register` (akun aktif setelah
// disetujui admin). Tampilan: kerangka auth terang bersama (src/components/auth). SPEC §2.
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../lib/api';
import { getRole, setSession } from '../lib/auth';
import { AuthLayout, AuthSwitch } from '../components/auth/AuthLayout';
import { AuthTabs } from '../components/auth/AuthTabs';
import { AuthField, AuthTextButton } from '../components/auth/AuthField';
import { AuthAlert, AuthSubmit, type AuthAlertTone } from '../components/auth/AuthFeedback';
import { pathAfterLogin, useAuthTitle, type SessionResponse } from '../components/auth/authForm';
import {
  checkEmail,
  checkPassword,
  checkPhone,
  checkText,
  focusFirstError,
  hasErrors,
  normalizePhone,
  type FieldErrors,
} from './account/components/validation';

type Mode = 'login' | 'register';
type StaffField = 'name' | 'phone' | 'email' | 'password';

const LOGIN_FIELDS: StaffField[] = ['email', 'password'];
const REGISTER_FIELDS: StaffField[] = ['name', 'phone', 'email', 'password'];
/** Field yang langsung dicek saat ditinggalkan (bila sudah diisi) */
const CHECK_ON_BLUR: StaffField[] = ['name', 'phone', 'email'];

interface Message {
  tone: AuthAlertTone;
  text: string;
}

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode: Mode = searchParams.get('type') === 'register' ? 'register' : 'login';
  const next = searchParams.get('next');
  const isLogin = mode === 'login';

  const [values, setValues] = useState<Record<StaffField, string>>({ name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<StaffField>>({});
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  // ?expired=1 dipasang src/lib/auth.ts saat server menolak sesi yang habis atau tidak valid
  const [message, setMessage] = useState<Message | null>(() =>
    searchParams.get('expired') ? { tone: 'warning', text: 'Sesi Anda telah berakhir. Silakan masuk kembali.' } : null,
  );
  useAuthTitle(isLogin ? 'Masuk panel admin' : 'Daftar akun staf');

  // Sudah masuk: langsung ke area masing-masing
  const role = getRole();
  if (role && !submitting) return <Navigate to={pathAfterLogin(role, next)} replace />;

  /** Mode disimpan di URL (?type=register) agar tautan & tombol kembali browser konsisten */
  const setModeParam = (target: Mode) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (target === 'register') params.set('type', 'register');
        else params.delete('type');
        params.delete('expired');
        return params;
      },
      { replace: true },
    );

  const switchMode = (target: Mode) => {
    if (submitting || target === mode) return;
    setModeParam(target);
    setErrors({});
    setMessage(null);
    setForgotOpen(false);
  };

  const check = (key: StaffField): string | undefined => {
    switch (key) {
      case 'name':
        return checkText(values.name, 'Nama lengkap', { min: 2, max: 100 });
      case 'phone':
        return checkPhone(values.phone, 'Nomor WhatsApp');
      case 'email':
        return checkEmail(values.email);
      case 'password':
        return isLogin ? (values.password ? undefined : 'Kata sandi wajib diisi.') : checkPassword(values.password);
    }
  };

  const field = (key: StaffField) => ({
    id: key,
    value: values[key],
    error: errors[key],
    disabled: submitting,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    onBlur: CHECK_ON_BLUR.includes(key)
      ? () => {
          if (values[key].trim()) setErrors((prev) => ({ ...prev, [key]: check(key) }));
        }
      : undefined,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    const order = isLogin ? LOGIN_FIELDS : REGISTER_FIELDS;
    const found: FieldErrors<StaffField> = {};
    for (const key of order) found[key] = check(key);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(order, found);
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const res = await apiPost<SessionResponse>('login', { email: values.email.trim(), password: values.password });
        setSession(res.token, res.user);
        navigate(pathAfterLogin(res.user.role, next), { replace: true });
        return;
      }
      // Peran dan status akun baru ditentukan server (staf biasa, menunggu persetujuan admin)
      const res = await apiPost<{ message?: string }>('register', {
        name: values.name.trim(),
        phone: normalizePhone(values.phone),
        email: values.email.trim(),
        password: values.password,
      });
      setValues((prev) => ({ ...prev, password: '' }));
      setErrors({});
      setModeParam('login');
      setMessage({ tone: 'success', text: res.message || 'Registrasi berhasil. Akun aktif setelah disetujui admin.' });
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 401
          ? 'Email atau kata sandi salah. Periksa lagi lalu coba masuk kembali.'
          : errorMessage(err, isLogin ? 'Gagal masuk. Silakan coba lagi.' : 'Gagal mendaftar. Silakan coba lagi.');
      setMessage({ tone: 'danger', text });
    }
    setSubmitting(false);
  };

  return (
    <AuthLayout
      title={isLogin ? 'Masuk panel admin' : 'Daftar akun staf'}
      subtitle={
        isLogin
          ? 'Khusus tim Garuda Nexa. Pembeli template yang masuk di sini diarahkan ke halaman akun.'
          : 'Akun staf baru aktif setelah disetujui administrator.'
      }
      tabs={
        <AuthTabs
          label="Pilih masuk atau daftar"
          items={[
            { key: 'login', label: 'Masuk' },
            { key: 'register', label: 'Daftar staf' },
          ]}
          active={mode}
          onSelect={(key) => switchMode(key as Mode)}
          disabled={submitting}
        />
      }
      footer={
        isLogin ? (
          <>
            <AuthSwitch text="Belum punya akun staf?" onClick={() => switchMode('register')}>
              Daftar sekarang
            </AuthSwitch>
            <AuthSwitch text="Pembeli template?" to="/masuk">
              Masuk ke akun pembeli
            </AuthSwitch>
          </>
        ) : (
          <AuthSwitch text="Sudah punya akun?" onClick={() => switchMode('login')}>
            Masuk di sini
          </AuthSwitch>
        )
      }
    >
      <AnimatePresence initial={false}>
        {message && (
          <AuthAlert key={message.text} tone={message.tone} onClose={() => setMessage(null)}>
            {message.text}
          </AuthAlert>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting || undefined}>
        {/* Field tambahan pendaftaran membuka/menutup dengan tinggi yang mengalir (seperti versi lama) */}
        <AnimatePresence initial={false}>
          {!isLogin && (
            <motion.div
              key="register-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              className="-mx-1 overflow-hidden px-1"
            >
              <div className="space-y-4 pb-4 sm:space-y-5 sm:pb-5">
                <AuthField
                  {...field('name')}
                  label="Nama lengkap"
                  icon={User}
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  placeholder="mis. Budi Santoso"
                />
                <AuthField
                  {...field('phone')}
                  label="Nomor WhatsApp"
                  icon={Phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  placeholder="mis. 081234567890"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 sm:space-y-5">
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
            placeholder="nama@perusahaan.com"
          />

          <div>
            <AuthField
              {...field('password')}
              password
              label="Kata sandi"
              icon={Lock}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              enterKeyHint="go"
              placeholder={isLogin ? 'Masukkan kata sandi' : 'Buat kata sandi'}
              help={isLogin ? undefined : 'Minimal 8 karakter.'}
              aside={
                isLogin ? (
                  <AuthTextButton onClick={() => setForgotOpen((v) => !v)} expanded={forgotOpen} controls="forgot-hint">
                    Lupa kata sandi?
                  </AuthTextButton>
                ) : undefined
              }
            />
            <AnimatePresence initial={false}>
              {isLogin && forgotOpen && (
                <AuthAlert key="forgot" id="forgot-hint" tone="info" spacing="top" onClose={() => setForgotOpen(false)}>
                  Hubungi administrator Garuda Nexa untuk mengatur ulang kata sandi akun staf Anda.
                </AuthAlert>
              )}
            </AnimatePresence>
          </div>

          <AuthSubmit loading={submitting} loadingText={isLogin ? 'Memproses...' : 'Mendaftarkan...'}>
            {isLogin ? 'Masuk' : 'Daftar sebagai staf'}
          </AuthSubmit>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Auth;
