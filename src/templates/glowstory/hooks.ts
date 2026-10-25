// Hook kecil GlowStory: section yang sedang dibaca (garis bawah item menu), "sudah digulir" (garis bawah header), dan
// perilaku dialog (fokus awal, Esc menutup, Tab berputar di dalam panel, fokus kembali ke pembuka). Tanpa
// IntersectionObserver (perayap, jsdom lama) → nilai awal, tanpa error.
import { useEffect, useRef, useState, type RefObject } from 'react';

/** Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (!root || typeof IntersectionObserver !== 'function' || !signature) return;
    const targets = signature
      .split(',')
      .map((key) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.getAttribute('data-tpl-section') ?? '', entry.isIntersecting);
        setActive(targets.map((el) => el.getAttribute('data-tpl-section') ?? '').find((key) => visible.get(key)) ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [anchor, signature]);
  return active;
}

/** true setelah penanda `sentinel` keluar dari layar (halaman sudah digulir melewatinya). */
export function useScrolledPast(sentinel: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinel]);
  return past;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Dialog sederhana (keranjang, foto ulasan): saat `open` fokus pindah ke elemen pertama di panel, Esc memanggil
 * `onClose`, Tab/Shift+Tab berputar di dalam panel; saat ditutup fokus kembali ke elemen yang membukanya.
 */
export function useDialog(open: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusables()[0]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Tanpa menggulir: pembuka biasanya masih terlihat, dan halaman tidak boleh melompat saat panel ditutup
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);
  return panel;
}
