import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getOrCreateActiveOrder,
  addToOrder,
  updateOrderItemQty,
  removeFromOrder,
  checkoutOrder,
} from "@/lib/cart.functions";

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  location: string | null;
}

interface CartOrder {
  id: string;
  status: string;
  total: number | null;
}

interface CartCtx {
  order: CartOrder | null;
  items: CartItem[];
  loading: boolean;
  adding: Set<string>;
  itemCount: number;
  subtotal: number;
  addProduct: (productId: string, productName: string, price: number, location?: string | null, qty?: number) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  checkout: () => Promise<{ token: string; total: number } | null>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CartCtx>({
  order: null, items: [], loading: false, adding: new Set(), itemCount: 0, subtotal: 0,
  addProduct: async () => {}, updateQty: async () => {}, removeItem: async () => {},
  checkout: async () => null, refresh: async () => {},
});

import { getStoredCustomer } from "@/lib/customer";

export function CartProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<CartOrder | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const getOrCreate = useServerFn(getOrCreateActiveOrder);
  const addToOrderFn = useServerFn(addToOrder);
  const updateQtyFn = useServerFn(updateOrderItemQty);
  const removeFn = useServerFn(removeFromOrder);
  const checkoutFn = useServerFn(checkoutOrder);

  const customerId = typeof window !== "undefined" ? getStoredCustomer()?.id : undefined;

  const refresh = useCallback(async () => {
    const cid = getStoredCustomer()?.id;
    if (!cid) { setLoading(false); return; }
    try {
      const result = await getOrCreate({ data: { customerId: cid } });
      setOrder(result.order);
      setItems(result.items as CartItem[]);
    } catch { /* ignore */ }
    setLoading(false);
  }, [getOrCreate]);

  useEffect(() => {
    const cid = getStoredCustomer()?.id;
    if (cid) {
      setLoading(true);
      refresh();
    } else {
      setOrder(null);
      setItems([]);
      setLoading(false);
    }
  }, [refresh]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  const addProduct = useCallback(async (productId: string, productName: string, price: number, location?: string | null, qty = 1) => {
    let currentOrder = order;
    if (!currentOrder) {
      const cid = getStoredCustomer()?.id;
      if (!cid) return;
      const result = await getOrCreate({ data: { customerId: cid } });
      setOrder(result.order);
      setItems(result.items as CartItem[]);
      currentOrder = result.order;
    }
    setAdding(prev => new Set(prev).add(productId));
    try {
      await addToOrderFn({ data: { orderId: currentOrder.id, productId, productName, price, location: location ?? null, quantity: qty } });
      await refresh();
    } finally {
      setAdding(prev => { const next = new Set(prev); next.delete(productId); return next; });
    }
  }, [order, addToOrderFn, refresh, getOrCreate]);

  const updateQty = useCallback(async (itemId: string, qty: number) => {
    if (!order) return;
    await updateQtyFn({ data: { itemId, orderId: order.id, quantity: qty } });
    await refresh();
  }, [order, updateQtyFn, refresh]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!order) return;
    await removeFn({ data: { itemId, orderId: order.id } });
    await refresh();
  }, [order, removeFn, refresh]);

  const checkout = useCallback(async () => {
    if (!order) return null;
    const result = await checkoutFn({ data: { orderId: order.id, contactEmail: "" } });
    setOrder(prev => prev ? { ...prev, status: "invoice_issued", total: result.total } : null);
    setItems([]);
    return { token: result.token, total: result.total };
  }, [order, checkoutFn]);

  return (
    <Ctx.Provider value={{ order, items, loading, adding, itemCount, subtotal, addProduct, updateQty, removeItem, checkout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
