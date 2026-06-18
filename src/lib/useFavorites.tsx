import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleFavorite as toggleFavFn, getFavoriteIds } from "@/lib/favorites.functions";
import { getStoredCustomer } from "@/lib/customer";

interface FavoritesCtx {
  favoriteIds: Set<string>;
  loading: boolean;
  toggle: (productId: string, productName: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<FavoritesCtx>({
  favoriteIds: new Set(),
  loading: false,
  toggle: async () => {},
  refresh: async () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const toggleServer = useServerFn(toggleFavFn);
  const getIdsServer = useServerFn(getFavoriteIds);

  const refresh = useCallback(async () => {
    const customer = getStoredCustomer();
    if (!customer?.id) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    try {
      const ids = await getIdsServer({ data: { customerId: customer.id } });
      setFavoriteIds(new Set(ids));
    } catch {
      // silent
    }
    setLoading(false);
  }, [getIdsServer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async (productId: string, productName: string) => {
    const customer = getStoredCustomer();
    if (!customer?.id) return;
    const prev = new Set(favoriteIds);
    // optimistically toggle
    if (prev.has(productId)) {
      prev.delete(productId);
      setFavoriteIds(prev);
    } else {
      prev.add(productId);
      setFavoriteIds(prev);
    }
    try {
      const result = await toggleServer({ data: { customerId: customer.id, productId, productName } });
      // reconcile
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (result.favorited) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } catch {
      // revert
      setFavoriteIds(prev);
    }
  }, [favoriteIds, toggleServer]);

  return (
    <Ctx.Provider value={{ favoriteIds, loading, toggle, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useFavorites = () => useContext(Ctx);
