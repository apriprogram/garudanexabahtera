import { useEffect } from 'react';

/** Set judul tab selama komponen tampil; judul sebelumnya dipulihkan saat keluar. Kosong = tidak diubah. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
