// Peringatan saat meninggalkan CMS dengan perubahan belum disimpan:
// - menutup tab / muat ulang / pindah situs → dialog bawaan browser (beforeunload)
// - klik tautan di dalam aplikasi (header akun, "Kembali", dsb.) → dialog konfirmasi (LeaveDialog) sebelum pindah halaman
// - tombol yang memulai navigasi sendiri (mis. "Keluar" di menu akun) → tunggu confirmLeave() lebih dulu
// Tautan bertanda data-leave-guard="off" atau target="_blank" dilewati.
import { createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import LeaveDialog from './LeaveDialog';
import { requestLeave } from './leaveStore';

// Dialog dirender di root React tersendiri (dibuat saat pertama dibutuhkan) supaya bisa ditanyakan dari mana saja:
// handler klik di document dan menu Keluar di AccountLayout, tanpa memasang komponen di setiap halaman.
let dialogRoot: Root | null = null;

function askLeave(message: string): Promise<boolean> {
  if (!dialogRoot) {
    const host = document.createElement('div');
    host.dataset.leaveDialog = '';
    document.body.appendChild(host);
    dialogRoot = createRoot(host);
    dialogRoot.render(createElement(LeaveDialog));
  }
  return requestLeave(message);
}

interface ActiveGuard {
  message: string;
  /** Pengguna sudah setuju pergi lewat confirmLeave(): navigasi berikutnya tidak ditanya lagi */
  released: boolean;
}

// Penjaga yang sedang aktif (hanya satu editor terbuka sekaligus). Disimpan di tingkat modul agar bagian lain aplikasi,
// mis. menu akun di AccountLayout, bisa bertanya tanpa context/prop drilling.
let activeGuard: ActiveGuard | null = null;

/**
 * Tanyakan dulu sebelum aksi yang meninggalkan halaman tanpa lewat tautan, mis. keluar akun. logout() menghapus sesi
 * SEBELUM pindah halaman, jadi dialog beforeunload terlambat: bila pengguna memilih tetap di halaman, sesinya sudah
 * hilang dan simpan berikutnya gagal. Mengembalikan true bila boleh lanjut (tidak ada perubahan, atau pengguna setuju).
 */
export async function confirmLeave(): Promise<boolean> {
  const guard = activeGuard;
  if (!guard || guard.released) return true;
  if (!(await askLeave(guard.message))) return false;
  // Pindah halaman sesudahnya (window.location.assign) tidak memunculkan dialog beforeunload kedua
  guard.released = true;
  return true;
}

export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;

    const guard: ActiveGuard = { message, released: false };
    activeGuard = guard;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (guard.released) return;
      event.preventDefault();
      // Browser lama membutuhkan returnValue terisi agar dialog muncul
      event.returnValue = '';
    };

    // Fase capture di document berjalan sebelum handler React (dipasang di #root), sehingga preventDefault di sini
    // juga membatalkan navigasi <Link> React Router.
    const onClick = (event: MouseEvent) => {
      if (guard.released) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.dataset.leaveGuard === 'off') return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // keluar situs: ditangani beforeunload
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      // Tahan navigasi selagi dialog terbuka; setuju → klik ulang tautan yang sama (lolos karena guard sudah dilepas)
      event.preventDefault();
      event.stopPropagation();
      void askLeave(message).then((leave) => {
        if (!leave) return;
        guard.released = true;
        if (anchor.isConnected) anchor.click();
        else window.location.assign(url.href);
      });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      if (activeGuard === guard) activeGuard = null;
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
