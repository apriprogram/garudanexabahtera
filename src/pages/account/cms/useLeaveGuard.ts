// Peringatan saat meninggalkan CMS dengan perubahan belum disimpan:
// - menutup tab / muat ulang / pindah situs → dialog bawaan browser (beforeunload)
// - klik tautan di dalam aplikasi (header akun, "Kembali", dsb.) → konfirmasi sebelum pindah halaman
// Tautan bertanda data-leave-guard="off" atau target="_blank" dilewati.
import { useEffect } from 'react';

export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browser lama membutuhkan returnValue terisi agar dialog muncul
      event.returnValue = '';
    };

    // Fase capture di document berjalan sebelum handler React (dipasang di #root), sehingga preventDefault di sini
    // juga membatalkan navigasi <Link> React Router.
    const onClick = (event: MouseEvent) => {
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
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
