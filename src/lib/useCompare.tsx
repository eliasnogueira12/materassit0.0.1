import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CompareProduct {
  id: string;
  name: string;
  price: number | null;
  promotion: number | null;
  image_url: string | null;
  category: string | null;
  location: string;
  description: string | null;
  stock: number | null;
}

interface CompareCtx {
  products: CompareProduct[];
  count: number;
  toggle: (p: CompareProduct) => void;
  isSelected: (id: string) => boolean;
  clear: () => void;
  remove: (id: string) => void;
}

const Ctx = createContext<CompareCtx>({
  products: [],
  count: 0,
  toggle: () => {},
  isSelected: () => false,
  clear: () => {},
  remove: () => {},
});

export function CompareProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CompareProduct[]>([]);

  const toggle = useCallback((p: CompareProduct) => {
    setProducts((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      if (exists) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 4) return prev;
      return [...prev, p];
    });
  }, []);

  const isSelected = useCallback((id: string) => products.some((p) => p.id === id), [products]);

  const clear = useCallback(() => setProducts([]), []);

  const remove = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ products, count: products.length, toggle, isSelected, clear, remove }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompare() {
  return useContext(Ctx);
}
