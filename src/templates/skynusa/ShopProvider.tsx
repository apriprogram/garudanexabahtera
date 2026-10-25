// Penyedia status toko demo (lihat ./shop): keranjang, panel keranjang, filter kebutuhan, barang terakhir, dan kalimat
// pengumuman pembaca layar. Barang yang sudah 9 unit tidak "ditambahkan" lagi (tanpa pengumuman & label palsu).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAX_QTY, addToCart, setCartQty, type CartLine } from './model';
import { ShopContext, type Shop } from './shop';

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<Shop['lastAdded']>(null);
  const [notice, setNotice] = useState('');
  // Isi keranjang terbaru untuk pengecekan di dalam handler (tanpa membuat ulang fungsi tiap perubahan)
  const cartRef = useRef<CartLine[]>([]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const add = useCallback((item: Omit<CartLine, 'qty'>) => {
    if ((cartRef.current.find((line) => line.id === item.id)?.qty ?? 0) >= MAX_QTY) return;
    setCart((current) => addToCart(current, item));
    setLastAdded({ id: item.id, name: item.name, at: Date.now() });
    setNotice(`${item.name} ditambahkan ke keranjang.`);
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    const name = cartRef.current.find((line) => line.id === id)?.name ?? '';
    setCart((current) => setCartQty(current, id, qty));
    setNotice(qty <= 0 ? `${name} dihapus dari keranjang.` : `Jumlah ${name}: ${Math.min(MAX_QTY, Math.floor(qty))}.`);
  }, []);
  const clear = useCallback(() => {
    setCart([]);
    setNotice('Keranjang dikosongkan.');
  }, []);

  const value = useMemo<Shop>(
    () => ({ cart, add, setQty, clear, cartOpen, setCartOpen, filter, setFilter, lastAdded, notice }),
    [cart, add, setQty, clear, cartOpen, filter, lastAdded, notice],
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
