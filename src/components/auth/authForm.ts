// Logika bersama halaman masuk/daftar (/login, /masuk, /daftar): tujuan setelah masuk, judul tab browser,
// dan tipe respons action `login` / `customer_register` (SPEC §2).
import { useEffect } from 'react';
import { safeNextPath, type SessionUser } from '../../lib/auth';

/** Respons action `login` dan `customer_register`: token sesi + profil. */
export interface SessionResponse {
  user: SessionUser;
  token: string;
  expires_at: number;
}

/** Tab halaman auth yang sebelumnya aktif (dikirim lewat state navigasi agar pill tab bergeser mulus). */
export interface AuthNavState {
  authTab?: string;
  /** Email yang sudah diketik di halaman sebelumnya (mis. "email sudah terdaftar" → masuk), untuk diisi otomatis */
  email?: string;
}

const STAFF_AREA = /^\/admin(?=[/?#]|$)/;
const NOT_FOR_CUSTOMER = /^\/(admin|login|auth|masuk|daftar)(?=[/?#]|$)/;

/**
 * Tujuan setelah masuk / sudah masuk.
 * - Pembeli (customer): `?next` bila path relatif situs ini (bukan /admin atau halaman masuk/daftar), selain itu /akun.
 * - Staf (admin/user): `?next` bila berada di /admin, selain itu /admin.
 */
export function pathAfterLogin(role: string | null | undefined, next: string | null): string {
  if (role === 'customer') {
    const target = safeNextPath(next, '/akun');
    return NOT_FOR_CUSTOMER.test(target) ? '/akun' : target;
  }
  const target = safeNextPath(next, '/admin');
  return STAFF_AREA.test(target) ? target : '/admin';
}

/** Judul tab browser: "Masuk | Garuda Nexa". */
export function useAuthTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Garuda Nexa`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
