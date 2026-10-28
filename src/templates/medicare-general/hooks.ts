// Hook & konteks kecil MediCare General (ditulis di folder ini, pola sama dengan dermaga/hooks.ts, tidak diimpor dari
// sana): section yang sedang dibaca (garis aktif di menu), penanda gerak sekali saat masuk layar (garis EKG, baris
// jadwal), ukuran teks yang diingat per perangkat, dan konteks "Daftar" dari tabel jadwal dokter ke formulir.
// Tanpa IntersectionObserver / localStorage → tetap jalan tanpa error (statis, ukuran normal).
import { createContext, useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { useMotionEnabled, watchEntrance } from '../shared/motion';
import { useSiteData } from '../shared/siteData';
import { TEXT_SIZE_KEY, parseTextSize } from './model';

/** Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  const page = useSiteData().route.kind;
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (page !== 'home' || !root || typeof IntersectionObserver !== 'function' || !signature) return;
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
  }, [anchor, signature, page]);
  return page === 'home' ? active : null;
}

/**
 * Tandai elemen `data-mc-play="pending"` saat mendekati layar lalu `"on"` saat masuk (sekali), untuk animasi CSS di
 * ./medicare-general.css (garis EKG, baris jadwal). Gerak mati → atribut tidak dipasang (keadaan akhir yang statis).
 */
export function usePlayOnce(ref: RefObject<HTMLElement | null>): void {
  const enabled = useMotionEnabled();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || el.dataset.mcPlay === 'on' || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => {
        el.dataset.mcPlay = 'pending';
      },
      enter: () => {
        el.dataset.mcPlay = 'on';
      },
    });
  }, [ref, enabled]);
}

// Ukuran teks: localStorage bila bisa, selain itu (mode privat, penyimpanan diblokir) cadangan di memori halaman.
let memorySize = 0;
const sizeListeners = new Set<() => void>();

const readStoredSize = (): number => {
  try {
    const raw = window.localStorage.getItem(TEXT_SIZE_KEY);
    return raw === null ? memorySize : parseTextSize(raw);
  } catch {
    return memorySize;
  }
};

function subscribeSize(onChange: () => void) {
  sizeListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    sizeListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Ukuran teks pilihan pengunjung (0 normal, 1 besar, 2 sangat besar), diingat di localStorage perangkat ini (dan ikut
 * berubah di tab lain). Render server/prerender selalu normal; gagal baca/tulis (mode privat) → berlaku sampai halaman
 * ditutup.
 */
export function useTextSize(): [number, (size: number) => void] {
  const size = useSyncExternalStore(subscribeSize, readStoredSize, () => 0);
  const choose = useCallback((next: number) => {
    const value = parseTextSize(String(next));
    memorySize = value;
    try {
      window.localStorage.setItem(TEXT_SIZE_KEY, String(value));
    } catch {
      // penyimpanan diblokir: cadangan memori di atas tetap dipakai
    }
    for (const listener of sizeListeners) listener();
  }, []);
  return [size, choose];
}

/** Ukuran teks aktif + pengubahnya, untuk kontrol di strip atas dan menu HP. */
export interface TextSizeState {
  size: number;
  setSize: (size: number) => void;
}

export const TextSizeContext = createContext<TextSizeState>({ size: 0, setSize: () => undefined });

/** Pilihan dari tombol "Daftar" di jadwal dokter: poli + nama dokter, `nonce` naik setiap klik. */
export interface RegistrationPick {
  poli: string;
  doctor: string;
  nonce: number;
}

export interface RegistrationPickState {
  pick: RegistrationPick | null;
  choose: (poli: string, doctor: string) => void;
}

export const RegistrationPickContext = createContext<RegistrationPickState>({ pick: null, choose: () => undefined });
