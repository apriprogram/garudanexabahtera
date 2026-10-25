// Penyedia status toko demo (lihat ./shop): keranjang, panel keranjang, filter kebutuhan, dan barang terakhir.
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { addToCart, setCartQty, type CartLine } from './model';
import { ShopContext, type Shop } from './shop';

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<Shop['lastAdded']>(null);

  const add = useCallback((item: Omit<CartLine, 'qty'>) => {
    setCart((current) => addToCart(current, item));
    setLastAdded({ id: item.id, name: item.name, at: Date.now() });
  }, []);
  const setQty = useCallback((id: string, qty: number) => setCart((current) => setCartQty(current, id, qty)), []);
  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<Shop>(
    () => ({ cart, add, setQty, clear, cartOpen, setCartOpen, filter, setFilter, lastAdded }),
    [cart, add, setQty, clear, cartOpen, filter, lastAdded],
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
