// Jembatan ke chat Nexa dari luar widget (hero gaya Prompt AI, sections/hero/HeroPrompt.tsx): pengunjung menulis di
// kotak prompt hero → panel Nexa terbuka dan pertanyaannya langsung dikirim, dijawab AI (nexa_chat) dengan kartu
// rekomendasi template / tautan form pesan custom, atau jawaban bawaan dari data situs bila AI mati. Store modul kecil +
// useSyncExternalStore (pola sections/hero/heroNavState.ts), tanpa context di App. FloatingWhatsApp mendaftarkan
// ketersediaan widget (chat hidup di halaman ini) dan membuka panel saat ada permintaan; NexaChat mengirimkannya.
import { useSyncExternalStore } from 'react';

export interface NexaRequest {
  id: number;
  /** Pertanyaan yang langsung dikirim ke Nexa; '' = hanya buka panel (mis. untuk input suara). */
  text: string;
  /** Mulai input suara begitu panel terbuka (tombol mikrofon di hero). */
  listen: boolean;
}

let request: NexaRequest | null = null;
let available = false;
let seq = 0;
const listeners = new Set<() => void>();
const requestListeners = new Set<(request: NexaRequest) => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Dipanggil setiap ada permintaan baru (FloatingWhatsApp membuka panel). Mengembalikan fungsi berhenti mendengar. */
export function onNexaRequest(listener: (request: NexaRequest) => void): () => void {
  requestListeners.add(listener);
  return () => {
    requestListeners.delete(listener);
  };
}

/** Dipanggil FloatingWhatsApp: widget Nexa terpasang (chat hidup) di halaman ini atau tidak. */
export function setNexaAvailable(value: boolean): void {
  if (available === value) return;
  available = value;
  emit();
}

/**
 * Kirim `text` ke Nexa (panel terbuka, pesan terkirim). false bila widget tidak ada di halaman ini (admin mematikan
 * chat, atau halaman tanpa Nexa): pemanggil memakai jalur cadangannya sendiri.
 */
export function askNexa(text: string, { listen = false }: { listen?: boolean } = {}): boolean {
  if (!available) return false;
  request = { id: ++seq, text, listen };
  emit();
  const current = request;
  requestListeners.forEach((listener) => listener(current));
  return true;
}

/** Dipanggil NexaChat setelah permintaan `id` dikirim (permintaan lain yang lebih baru tidak disentuh). */
export function clearNexaRequest(id: number): void {
  if (request?.id !== id) return;
  request = null;
  emit();
}

/**
 * Buang permintaan yang belum sempat dikirim: panel ditutup pengunjung saat Nexa masih mengetik, atau widget dilepas
 * (pindah ke halaman tanpa Nexa). Tanpa ini permintaan lama terkirim sendiri saat panel dibuka manual nanti.
 */
export function dropNexaRequest(): void {
  if (!request) return;
  request = null;
  emit();
}

/** Permintaan yang belum dikirim (tes). */
export const getNexaRequest = (): NexaRequest | null => request;

/** HTML prerender & hidrasi: tidak ada permintaan / widget (sama dengan server), lalu nilai sebenarnya. */
export const useNexaRequest = (): NexaRequest | null => useSyncExternalStore(subscribe, () => request, () => null);
export const useNexaAvailable = (): boolean => useSyncExternalStore(subscribe, () => available, () => false);

/** Kembali ke keadaan awal (tes). */
export function resetNexaBridge(): void {
  request = null;
  available = false;
  seq = 0;
  requestListeners.clear();
  emit();
}
