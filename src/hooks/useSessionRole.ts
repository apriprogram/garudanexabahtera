import { useSyncExternalStore } from 'react';
import { getRole } from '../lib/auth';

/** Peran akun yang sedang login ('customer' | 'admin' | 'user'), atau null bila belum login / sesi habis. */
export const readSessionRole = (): string | null => {
  try {
    return getRole();
  } catch {
    return null; // localStorage diblokir / data sesi rusak
  }
};

/** Login/logout di tab lain memicu event `storage`. Di tab yang sama, komponen membaca ulang tiap render. */
export const subscribeSession = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};

/**
 * Peran sesi untuk chrome publik (Navbar, Footer, menu akun). Dibaca ulang tiap render (mis. setelah pindah halaman)
 * dan saat login/logout di tab lain. Saat render server/tes tanpa window: null.
 */
export const useSessionRole = (): string | null => useSyncExternalStore(subscribeSession, readSessionRole, () => null);

export type SessionKind = 'guest' | 'customer' | 'staff';

/** Jenis pengunjung dari peran: tamu, pembeli template (customer), atau staf (admin/user panel). */
export const sessionKind = (role: string | null): SessionKind =>
  role === 'customer' ? 'customer' : role === 'admin' || role === 'user' ? 'staff' : 'guest';

/** Tautan akun utama sesuai sesi (label sesuai glosarium design.md): Masuk / Akun Saya / Panel Admin. */
export const accountLinkFor = (role: string | null): { to: string; label: string } => {
  const kind = sessionKind(role);
  if (kind === 'customer') return { to: '/akun', label: 'Akun Saya' };
  if (kind === 'staff') return { to: '/admin', label: 'Panel Admin' };
  return { to: '/masuk', label: 'Masuk' };
};
