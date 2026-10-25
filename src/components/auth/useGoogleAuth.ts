// Alur "Masuk/Daftar dengan Google" bersama untuk /masuk dan /daftar (docs/platform/GOOGLE-LOGIN.md): credential dari
// tombol Google dikirim ke customer_google_auth. Akun yang sudah ada (atau email Gmail yang baru ditautkan) langsung
// masuk; email yang belum terdaftar membuka langkah kedua (nomor WhatsApp, GoogleSignupForm) dengan credential yang
// sama, lalu akun dibuat dan langsung masuk.
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import { setSession } from '../../lib/auth';
import { credentialEmail } from '../../lib/googleIdentity';
import { pathAfterLogin, type SessionResponse } from './authForm';

/** Respons customer_google_auth: sesi (akun ada / ditautkan / dibuat) atau permintaan langkah kedua. */
export type GoogleAuthResponse =
  | (SessionResponse & { account: 'login' | 'linked' | 'created' })
  | { signup_required: true; profile: { name: string; email: string } };

/** Pendaftaran lewat Google yang menunggu nomor WhatsApp. */
export interface GoogleSignup {
  credential: string;
  name: string;
  email: string;
}

export type GoogleSignupField = 'name' | 'phone';

/** Email sudah terdaftar dan harus masuk dengan kata sandi (bukan Gmail/Workspace, atau tertaut akun Google lain). */
const PASSWORD_CODES = new Set(['GOOGLE_NEEDS_PASSWORD', 'GOOGLE_OTHER_ACCOUNT']);

interface Options {
  /** ?next halaman ini (mentah); tujuan akhirnya disaring pathAfterLogin */
  next: string | null;
  /** Email yang harus masuk dengan kata sandi: /masuk mengisi kolom email dengannya */
  onPasswordRequired?: (email: string) => void;
}

export function useGoogleAuth({ next, onPasswordRequired }: Options) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Email yang harus masuk dengan kata sandi (untuk tautan "Masuk dengan email ini" di /daftar) */
  const [passwordEmail, setPasswordEmail] = useState<string | null>(null);
  const [signup, setSignup] = useState<GoogleSignup | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<GoogleSignupField, string>>>({});

  const submit = useCallback(
    async (credential: string, extra?: { name: string; phone: string }) => {
      setBusy(true);
      setError(null);
      setPasswordEmail(null);
      setFieldErrors({});
      try {
        const res = await apiPost<GoogleAuthResponse>('customer_google_auth', { credential, ...extra });
        if ('signup_required' in res) {
          setSignup({ credential, name: res.profile.name, email: res.profile.email });
          setBusy(false);
          return;
        }
        setSession(res.token, res.user);
        navigate(pathAfterLogin(res.user.role, next), { replace: true });
      } catch (err) {
        setBusy(false);
        if (err instanceof ApiError && err.code === 'VALIDATION' && err.fieldErrors) {
          setFieldErrors({ name: err.fieldErrors.name, phone: err.fieldErrors.phone });
          return;
        }
        // Token Google sudah kedaluwarsa (langkah kedua dibiarkan lama) atau ditolak: mulai lagi dari tombol Google
        if (err instanceof ApiError && err.code === 'GOOGLE_TOKEN_INVALID') setSignup(null);
        if (err instanceof ApiError && err.code && PASSWORD_CODES.has(err.code)) {
          const email = credentialEmail(credential);
          if (email) {
            setPasswordEmail(email);
            onPasswordRequired?.(email);
          }
        }
        setError(errorMessage(err, 'Gagal masuk dengan Google. Silakan coba lagi.'));
      }
    },
    [navigate, next, onPasswordRequired],
  );

  const onCredential = useCallback((credential: string) => void submit(credential), [submit]);

  const completeSignup = useCallback(
    (name: string, phone: string) => {
      if (signup) void submit(signup.credential, { name, phone });
    },
    [signup, submit],
  );

  const cancelSignup = useCallback(() => {
    setSignup(null);
    setFieldErrors({});
    setError(null);
  }, []);

  return {
    busy,
    error,
    clearError: () => setError(null),
    passwordEmail,
    signup,
    fieldErrors,
    onCredential,
    completeSignup,
    cancelSignup,
  };
}
