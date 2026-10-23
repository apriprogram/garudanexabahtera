// Jembatan Hero → Navbar: apakah hero beranda berlatar gambar/video, dan nada teks navbar transparan di puncak
// halaman (diukur dari strip latar di belakang navbar, lihat useHeroLegibility + decideNavTone). Navbar tidak ada di
// dalam Hero, jadi keadaan dibagi lewat store modul kecil + useSyncExternalStore (tanpa context di App).
import { useSyncExternalStore } from 'react';
import type { HeroTone } from './heroContrast';

export interface HeroNavState {
  /** Hero beranda sedang menampilkan gambar/video (bukan kanvas bawaan, bukan media yang habis) */
  media: boolean;
  /** Nada teks navbar di atas strip media; null = sedang mengukur / tidak terukur / tidak terbaca → putih kaca */
  tone: HeroTone | null;
}

export const HERO_NAV_DEFAULT: HeroNavState = { media: false, tone: null };

let state: HeroNavState = HERO_NAV_DEFAULT;
const listeners = new Set<() => void>();

/** Dipanggil Hero; nilai yang sama tidak memberi tahu pendengar (Navbar tidak render ulang). */
export function setHeroNavState(next: HeroNavState): void {
  if (next.media === state.media && next.tone === state.tone) return;
  state = next.media || next.tone ? next : HERO_NAV_DEFAULT;
  listeners.forEach((listener) => listener());
}

/** Keadaan saat ini (di luar React, mis. tes). */
export const getHeroNavState = (): HeroNavState => state;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** HTML prerender & render hidrasi pertama = bawaan (sama dengan server), lalu nilai dari Hero. */
export const useHeroNavState = (): HeroNavState =>
  useSyncExternalStore(subscribe, () => state, () => HERO_NAV_DEFAULT);
