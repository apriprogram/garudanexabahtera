// Konteks toko GlowStory (keranjang + lapisan melayang), dipisah dari ./store.tsx agar file komponen hanya mengekspor
// komponen (react-refresh).
import { createContext, useContext } from 'react';
import type { CartLine } from './model';

export interface PhotoView {
  src: string;
  alt: string;
  /** Nama pengulas */
  title: string;
  /** Produk & kutipan singkat */
  detail: string;
}

export type Overlay = { kind: 'cart' } | { kind: 'photos'; photos: PhotoView[]; index: number } | null;

export interface Store {
  lines: CartLine[];
  count: number;
  total: number;
  /** Tambah satu barang; false bila harga tidak bisa dibaca */
  add: (name: string, price: string) => boolean;
  /** Tambah banyak barang sekaligus (mis. rutinitas hasil kuis); jumlah barang yang masuk */
  addMany: (items: { name: string; price: string }[], label: string) => number;
  setQty: (name: string, qty: number) => void;
  /** Pesan terakhir untuk pembaca layar & notifikasi kecil */
  notice: { id: number; text: string } | null;
  overlay: Overlay;
  openCart: () => void;
  openPhotos: (photos: PhotoView[], index: number) => void;
  setPhotoIndex: (index: number) => void;
  closeOverlay: () => void;
}

const noop = () => undefined;
export const StoreContext = createContext<Store>({
  lines: [],
  count: 0,
  total: 0,
  add: () => false,
  addMany: () => 0,
  setQty: noop,
  notice: null,
  overlay: null,
  openCart: noop,
  openPhotos: noop,
  setPhotoIndex: noop,
  closeOverlay: noop,
});

export const useStore = () => useContext(StoreContext);
