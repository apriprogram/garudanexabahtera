import { useEffect, useRef, type RefObject } from 'react';

/** Elemen yang bisa menerima fokus Tab. */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Elemen fokus di dalam `container` yang benar-benar terlihat, sesuai urutan dokumen. Dilewati: elemen tersembunyi
 * (display:none / visibility:hidden), di dalam subtree `inert`, dan yang ditandai `data-focus-trap-ignore`
 * (mis. SkipLink di dalam <header>). Tanpa mesin tata letak (jsdom) ukuran elemen tidak bisa dinilai, jadi hanya
 * atribut & gaya yang dicek.
 */
export const getFocusable = (container: HTMLElement): HTMLElement[] => {
  const hasLayout = container.getClientRects().length > 0;
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.closest('[inert],[data-focus-trap-ignore]') &&
      (!hasLayout || el.getClientRects().length > 0) &&
      getComputedStyle(el).visibility !== 'hidden',
  );
};

export interface FocusTrapOptions {
  /**
   * Ke mana fokus dipindah saat trap aktif: `first` = elemen fokus pertama, `container` = container itu sendiri
   * (diberi tabindex -1 bila perlu), `none` = fokus dibiarkan (mis. tetap di tombol pemicu yang ada di dalam container).
   * Default `first`.
   */
  initialFocus?: 'first' | 'container' | 'none';
  /**
   * Tombol/elemen yang menerima fokus lagi saat trap nonaktif. Default: elemen yang fokus saat trap aktif.
   * Fokus hanya dikembalikan bila saat itu masih di dalam container atau hilang ke <body> (bukan bila pengguna
   * sudah mengeklik elemen lain di luar).
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Dipanggil saat Escape ditekan selama trap aktif (mis. menutup menu/dialog). */
  onEscape?: () => void;
}

/**
 * Menjaga fokus keyboard di dalam satu container selama `active` (menu HP, dialog, lightbox):
 * Tab di elemen terakhir kembali ke yang pertama, Shift+Tab di elemen pertama ke yang terakhir, dan fokus yang
 * lepas ke luar container ditarik kembali. Saat nonaktif/unmount, fokus kembali ke pemicu.
 *
 * Pakai: `const ref = useFocusTrap<HTMLDivElement>(open, { onEscape: close });` lalu `<div ref={ref}>`.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, options: FocusTrapOptions = {}) {
  const ref = useRef<T | null>(null);
  // Opsi terbaru dibaca lewat ref agar callback inline tidak memasang ulang listener tiap render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return undefined;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { initialFocus = 'first' } = optionsRef.current;

    if (initialFocus === 'container') {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    } else if (initialFocus === 'first' && !container.contains(document.activeElement)) {
      (getFocusable(container)[0] ?? container).focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && optionsRef.current.onEscape) {
        event.preventDefault();
        optionsRef.current.onEscape();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current);
      if (event.shiftKey && (!inside || current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Fokus yang lepas ke luar container (mis. lewat klik di latar) ditarik kembali ke elemen pertama
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) {
        (getFocusable(container)[0] ?? container).focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      const target = optionsRef.current.returnFocusRef?.current ?? opener;
      const now = document.activeElement;
      const lost = !now || now === document.body || container.contains(now);
      if (target && lost && target.isConnected) target.focus({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
