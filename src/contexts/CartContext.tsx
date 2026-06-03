import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type CartItem = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  image?: string;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotalCents: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "spott_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.id === item.id);
      if (found) return cur.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
      return [...cur, { ...item, qty }];
    });
  }, []);

  const remove = useCallback((id: string) => setItems((c) => c.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotalCents = items.reduce((s, i) => s + i.qty * i.price_cents, 0);

  return <Ctx.Provider value={{ items, add, remove, clear, count, subtotalCents }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
