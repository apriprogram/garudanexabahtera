// Status toko demo SkyNusa yang dibagi antar section: keranjang (header ↔ produk ↔ paket) dan filter kebutuhan
// (kartu kategori ↔ daftar produk). Hanya di memori peramban: tidak ada backend keranjang; pesanan dikirim lewat
// WhatsApp dari panel keranjang. Provider: ./ShopProvider. Tanpa provider (mis. section dirender sendiri) → nilai diam.
import { createContext, useContext } from 'react';
import type { CartLine } from './model';

export interface Shop {
  cart: CartLine[];
  add: (item: Omit<CartLine, 'qty'>) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  /** Label kebutuhan yang dipilih di daftar produk (null = semua) */
  filter: string | null;
  setFilter: (tag: string | null) => void;
  /** Barang terakhir yang benar-benar masuk keranjang (label tombol "Masuk keranjang" sesaat) */
  lastAdded: { id: string; name: string; at: number } | null;
  /** Kalimat untuk pembaca layar tentang perubahan keranjang terakhir (tambah, ubah jumlah, hapus, kosongkan) */
  notice: string;
}

const noop = () => undefined;

export const ShopContext = createContext<Shop>({
  cart: [],
  add: noop,
  setQty: noop,
  clear: noop,
  cartOpen: false,
  setCartOpen: noop,
  filter: null,
  setFilter: noop,
  lastAdded: null,
  notice: '',
});

export const useShop = (): Shop => useContext(ShopContext);
