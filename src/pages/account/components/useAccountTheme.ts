// Tema panel akun pembeli (terang / gelap), disimpan per perangkat di localStorage.
// - AccountLayout memakai hook ini. Selama /akun terbuka, kelas .account-dark dipasang di <html>, jadi dialog dan toast
//   yang dirender lewat portal ikut gelap. Saat keluar dari /akun kelasnya dilepas, jadi situs publik tetap terang.
// - Token warnanya ada di src/index.css (html.account-dark). Nilainya mengikuti tema gelap panel admin.
import { useCallback, useLayoutEffect, useState } from 'react';

export type AccountTheme = 'light' | 'dark';

export const ACCOUNT_THEME_KEY = 'accountTheme';
export const ACCOUNT_DARK_CLASS = 'account-dark';

const readTheme = (): AccountTheme => {
  try {
    return localStorage.getItem(ACCOUNT_THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export function useAccountTheme() {
  const [theme, setTheme] = useState<AccountTheme>(readTheme);

  // Layout effect: kelas terpasang sebelum layar dilukis, jadi tidak ada kilatan tema terang
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(ACCOUNT_DARK_CLASS, theme === 'dark');
    return () => root.classList.remove(ACCOUNT_DARK_CLASS);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: AccountTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(ACCOUNT_THEME_KEY, next);
    } catch {
      // penyimpanan tidak tersedia: tema hanya berlaku untuk sesi ini
    }
  }, [theme]);

  return { theme, toggleTheme };
}
